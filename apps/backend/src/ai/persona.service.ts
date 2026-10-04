import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PersonaProfile } from '../common/types';

@Injectable()
export class PersonaService {
  private readonly logger = new Logger(PersonaService.name);
  private readonly personaPath = path.resolve(process.env.PERSONA_PATH || './storage/persona_context.json');
  private profile: PersonaProfile;

  // Bộ câu hỏi phỏng vấn để thu thập phong cách giao tiếp tự nhiên của người dùng
  public readonly interviewQuestions = [
    {
      id: 1,
      topic: 'Xưng hô & Giới thiệu',
      question: 'Khi một khách hàng lạ nhắn tin hỏi "Shop ơi có đó không?", bạn thường chào và xưng hô lại thế nào?',
    },
    {
      id: 2,
      topic: 'Báo giá & Chốt đơn',
      question: 'Khách hỏi "Sản phẩm này giá bao nhiêu vậy, có freeship không?", bạn sẽ gõ tin nhắn đáp lại ra sao?',
    },
    {
      id: 3,
      topic: 'Xử lý tình huống bận',
      question: 'Khi bạn đang đi ngoài đường hoặc bận việc gấp chưa kịp kiểm tra hàng, bạn sẽ nhắn gì để khách thông cảm chờ?',
    },
    {
      id: 4,
      topic: 'Từ ngữ thói quen & Cảm xúc',
      question: 'Bạn có hay dùng các từ đệm hay icon nào không (ví dụ: "dạ", "nha", "oke", "hihi", icon ❤️, 👍)? Hãy gõ 1 câu bất kỳ bạn hay gửi.',
    },
  ];

  constructor() {
    this.ensureFileExists();
    this.loadProfile();
  }

  private ensureFileExists() {
    const dir = path.dirname(this.personaPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.personaPath)) {
      const defaultProfile: PersonaProfile = {
        name: 'Chủ tài khoản Zalo',
        tone: 'Lịch sự, thân thiện, súc tích, tự nhiên',
        pronouns: { self: 'mình', customer: 'bạn' },
        samplePhrases: [
          'Dạ vâng bạn đợi mình xíu nha!',
          'Oke bạn nhé, để mình kiểm tra rồi nhắn lại liền.',
        ],
        rules: [
          'Trả lời ngắn gọn từ 1 đến 3 câu.',
          'Xưng hô chuẩn mực theo thói quen cá nhân.',
          'Luôn giữ thái độ niềm nở và sẵn sàng hỗ trợ.',
        ],
        backgroundContext: 'Tư vấn viên Zalo cá nhân.',
      };
      fs.writeFileSync(this.personaPath, JSON.stringify(defaultProfile, null, 2), 'utf-8');
    }
  }

  loadProfile(): PersonaProfile {
    try {
      const raw = fs.readFileSync(this.personaPath, 'utf-8');
      this.profile = JSON.parse(raw);
    } catch (error) {
      this.logger.error(`Lỗi đọc file persona_context.json: ${error.message}`);
    }
    return this.profile;
  }

  getProfile(): PersonaProfile {
    if (!this.profile) this.loadProfile();
    return this.profile;
  }

  saveProfile(updated: PersonaProfile): void {
    this.profile = updated;
    fs.writeFileSync(this.personaPath, JSON.stringify(updated, null, 2), 'utf-8');
    this.logger.log('Đã cập nhật Persona Profile thành công vào đĩa!');
  }
}
