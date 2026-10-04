import { Injectable, Logger } from '@nestjs/common';
import { PersonaService } from './persona.service';
import { PersonaProfile } from '../common/types';
import { SettingsService } from '../automation/settings.service';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  constructor(
    private readonly personaService: PersonaService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Tạo System Prompt nhúng chặt chẽ Persona Context đã huấn luyện
   */
  private buildSystemPrompt(persona: PersonaProfile): string {
    const settings = this.settingsService.getSettings();
    const customExtra = settings.systemPromptOverride ? `\n- HƯỚNG DẪN BỔ SUNG: ${settings.systemPromptOverride}` : '';

    return `
Bạn là AI đại diện của chủ tài khoản Zalo cá nhân. Nhiệm vụ của bạn là thay mặt chủ tài khoản trả lời tin nhắn của khách hàng/bạn bè.
Bạn PHẢI NHÁI CHÍNH XÁC phong cách hành văn, xưng hô và cá tính của chủ tài khoản theo mô tả sau:

--- HỒ SƠ TÍNH CÁCH (PERSONA PROFILE) ---
- Tên/Vai vế: ${persona.name}
- Giọng điệu (Tone): ${persona.tone}
- Cách xưng hô bắt buộc:
  + Bản thân tự xưng là: "${persona.pronouns.self}"
  + Gọi người nhắn đến là: "${persona.pronouns.customer}"
- Các câu văn/cụm từ mẫu mà chủ tài khoản thường dùng:
${persona.samplePhrases.map((p) => `  * "${p}"`).join('\n')}
- Các nguyên tắc phản hồi bắt buộc:
${persona.rules.map((r) => `  * ${r}`).join('\n')}
- Bối cảnh hoạt động: ${persona.backgroundContext || 'Trò chuyện Zalo thông thường'}${customExtra}
---------------------------------------

LƯU Ý QUAN TRỌNG:
1. Trả lời cực kỳ tự nhiên như một con người đang gõ trên điện thoại (viết hoa thường linh hoạt, dùng từ ngữ đời thường của người Việt).
2. Tuyệt đối KHÔNG trả lời như robot (không dùng: "Kính thưa quý khách", "Tôi là trợ lý AI",...).
3. Chỉ đưa ra nội dung câu trả lời, không kèm thêm bất kỳ lời giải thích nào. Độ dài lý tưởng: 1 - 2 câu ngắn.
`.trim();
  }

  /**
   * Sinh câu trả lời tự động cho một tin nhắn đến từ khách hàng
   */
  async generateReply(senderName: string, messageContent: string): Promise<string> {
    const settings = this.settingsService.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || '';

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      this.logger.warn('Chưa cấu hình GEMINI_API_KEY! Trả lời tin nhắn mẫu.');
      return `Dạ chào ${senderName}, mình đã nhận được tin nhắn: "${messageContent}". Mình đang bận xíu sẽ nhắn lại ngay nha!`;
    }

    const persona = this.personaService.getProfile();
    const systemInstruction = this.buildSystemPrompt(persona);

    // Danh sách models ưu tiên: model cấu hình -> fallback
    const preferredModel = settings.geminiModel || 'gemini-3.8-flash';
    const modelsToTry = [
      preferredModel,
      preferredModel !== 'gemini-2.5-flash' ? 'gemini-2.5-flash' : 'gemini-1.5-flash',
      'gemini-1.5-flash',
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Khách hàng "${senderName}" vừa gửi tin nhắn: "${messageContent}". Hãy đóng vai chủ tài khoản và trả lời lại tin nhắn này:`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API [${model}] Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (reply) {
          this.logger.log(`[Gemini (${model}) Reply] -> "${reply}"`);
          return reply;
        }
      } catch (error) {
        this.logger.warn(`Lỗi khi gọi model ${model}: ${error.message}. Đang thử model kế tiếp...`);
      }
    }

    return `Dạ vâng ${senderName}, mình đang kiểm tra một chút rồi nhắn lại ngay nhé!`;
  }

  /**
   * Phân tích các câu trả lời phỏng vấn để cập nhật hồ sơ Persona tự động
   */
  async extractPersonaFromInterview(qaPairs: { question: string; answer: string }[]): Promise<PersonaProfile> {
    const settings = this.settingsService.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || '';
    const current = this.personaService.getProfile();

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      this.logger.warn('Chưa có GEMINI_API_KEY để trích xuất Persona. Giữ nguyên cấu hình cũ.');
      return current;
    }

    try {
      const prompt = `
Bạn là chuyên gia phân tích ngôn ngữ học. Dưới đây là các câu trả lời phỏng vấn của một người dùng về thói quen nhắn tin Zalo:
${qaPairs.map((qa, i) => `${i + 1}. Câu hỏi: ${qa.question}\nTrả lời của người dùng: "${qa.answer}"`).join('\n\n')}

Hãy phân tích và trả về DUY NHẤT một chuỗi JSON chuẩn (không có markdown codeblock) khớp với schema sau:
{
  "name": "Chủ tài khoản Zalo",
  "tone": "mô tả giọng điệu từ các câu trả lời",
  "pronouns": {
    "self": "từ người đó hay xưng (vd: mình/em/tớ/anh)",
    "customer": "từ người đó hay gọi khách (vd: bạn/anh/chị/cậu)"
  },
  "samplePhrases": ["3-5 câu tiêu biểu trích ra hoặc phỏng theo cách trả lời"],
  "rules": ["3-4 quy tắc hành văn rút ra (ví dụ: dùng nhiều icon, nói ngắn, luôn vâng dạ)"],
  "backgroundContext": "mô tả ngắn về bối cảnh công việc rút ra từ câu trả lời"
}
`.trim();

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed: PersonaProfile = JSON.parse(text);

      this.personaService.saveProfile(parsed);
      return parsed;
    } catch (err) {
      this.logger.error(`Lỗi trích xuất Persona bằng Gemini: ${err.message}`);
      return current;
    }
  }
}
