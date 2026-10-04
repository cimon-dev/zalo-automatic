'use client';

import React, { useState, useEffect } from 'react';
import { PersonaProfile, InterviewQuestion } from '../hooks/useSocket';
import { Sparkles, Brain, CheckCircle2, MessageSquareText, Save, RefreshCw } from 'lucide-react';

interface PersonaTrainerProps {
  onGetPersonaData: () => Promise<{ profile: PersonaProfile; questions: InterviewQuestion[] }>;
  onSubmitInterview: (answers: { question: string; answer: string }[]) => Promise<any>;
}

export const PersonaTrainer: React.FC<PersonaTrainerProps> = ({
  onGetPersonaData,
  onSubmitInterview,
}) => {
  const [profile, setProfile] = useState<PersonaProfile | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await onGetPersonaData();
      if (data) {
        setProfile(data.profile);
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const formattedAnswers = questions.map((q) => ({
        question: q.question,
        answer: answers[q.id] || '(Chưa trả lời)',
      }));

      const res = await onSubmitInterview(formattedAnswers);
      if (res?.profile) {
        setProfile(res.profile);
        setSuccessMsg('🎉 Đã cập nhật giọng điệu cá nhân thành công vào persona_context.json!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 flex flex-col gap-6">
      {/* Giới thiệu */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-400" />
            Phòng Huấn Luyện Giọng Điệu AI (Persona Engine)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Hãy trả lời các câu hỏi tình huống bên dưới bằng cách gõ tự nhiên như bạn thường nhắn tin hàng ngày trên Zalo.
            Gemini sẽ phân tích phong cách xưng hô, từ vựng và câu cú để nhái lại chính xác giọng điệu của bạn khi tự động trả lời khách.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Tải lại
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1: Phỏng vấn thu thập phong cách */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/10 flex flex-col gap-5">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-blue-400" />
            Các câu hỏi tình huống giao tiếp
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    Tình huống {idx + 1}: {q.topic}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-200">{q.question}</p>
                <textarea
                  rows={2}
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Gõ cách bạn sẽ trả lời vào đây..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gemini đang phân tích và huấn luyện giọng điệu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Lưu & Huấn Luyện AI Theo Giọng Điệu Này
                </>
              )}
            </button>
          </form>
        </div>

        {/* Cột 2: Hồ sơ Persona hiện tại */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Hồ sơ đang áp dụng (persona_context.json)
          </h3>

          {profile ? (
            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tên & Giọng điệu:</span>
                <span className="text-white font-medium">{profile.tone}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Xưng hô:</span>
                <span className="text-indigo-300 font-semibold">
                  Tự xưng: &ldquo;{profile.pronouns.self}&rdquo; &bull; Gọi khách: &ldquo;{profile.pronouns.customer}&rdquo;
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Câu mẫu thường dùng:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {profile.samplePhrases.map((phrase, i) => (
                    <li key={i} className="italic">&ldquo;{phrase}&rdquo;</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Quy tắc phản hồi:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {profile.rules.map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Đang tải hồ sơ...</div>
          )}
        </div>
      </div>
    </div>
  );
};
