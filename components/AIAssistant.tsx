
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisStats, Language } from '../types';

interface AIAssistantProps {
  stats: AnalysisStats;
  lang: Language;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  grounding?: any[];
  isThinking?: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ stats, lang, onClose }) => {
  const initMsg = lang === 'uk' 
    ? 'Вітаю. Я інженерний AI-асистент. Я проаналізував дані напруги згідно українських стандартів. Чим можу допомогти?'
    : lang === 'ru' 
        ? 'Здравствуйте. Я инженерный ИИ-ассистент. Я проанализировал данные по напряжению. Чем могу помочь?' 
        : 'Hello. I am an engineering AI assistant. I have analyzed the voltage data. How can I help?';

  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: initMsg }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let model = useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview'; 
      
      const config: any = {
        systemInstruction: `
        Ти — досвідчений інженер-електрик та аналітик даних. Твоя спеціалізація — аналіз якості електроенергії (Voltage Analysis).
        Твоя мова спілкування: ${lang === 'uk' ? 'УКРАЇНСЬКА (Ukrainian)' : lang === 'ru' ? 'РУССКИЙ (Russian)' : 'ENGLISH'}.
        
        Контекст аналізу (Стандарт ДСТУ EN 50160:2014, номінал 230В ±10%):
        - Всього точок даних: ${stats.totalPoints}
        - Подій зниженої напруги (Undervoltage): ${stats.cntUnder}
        - Подій перенапруги (Overvoltage): ${stats.cntOver}
        - Дисбаланс фаз (Imbalance): ${stats.cntImbalance}
        - Критичні просадки (<190В): ${stats.cntDeepDip}
        - Загальний рівень ризику: ${stats.riskLevel}
        - !!! ПОМИЛКИ ПАРСИНГУ/ПОШКОДЖЕНІ ЗАПИСИ: ${stats.cntInvalidDates} !!!

        Правила:
        1. Відповідай коротко, професійно, використовуючи технічну термінологію.
        2. Ігноруй питання, не пов'язані з електрикою, фізикою або аналізом даних.
        3. Якщо питають про норми, посилайся на українські стандарти (230В ±10%).
        4. Якщо кількість пошкоджених записів > 0, обов'язково попередь користувача, що аналіз може бути неточним.
        `,
      };

      if (useThinking) {
        config.thinkingConfig = { thinkingBudget: 16384 };
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: userMsg.text }] },
        config: config
      });

      const text = response.text || (lang === 'uk' ? "Немає відповіді." : "No response.");
      setMessages(prev => [...prev, { role: 'model', text }]);

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const t = {
      title: lang === 'uk' ? 'AI Асистент' : lang === 'ru' ? 'ИИ Ассистент' : 'AI Assistant',
      subtitle: lang === 'uk' ? 'Інженерний Консультант' : lang === 'ru' ? 'Инженерный Консультант' : 'Engineering Consultant',
      placeholder: lang === 'uk' ? 'Задайте технічне питання...' : lang === 'ru' ? 'Задайте технический вопрос...' : 'Ask a technical question...',
      thinking: lang === 'uk' ? 'Глибоке мислення' : lang === 'ru' ? 'Глубокое мышление' : 'Deep Thinking',
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-[#0f172a]/95 backdrop-blur-xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50 flex flex-col animate-fade-in-up transition-transform duration-300">
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
             <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-white text-lg tracking-tight">{t.title}</h3>
            <span className="text-xs text-blue-300 font-medium uppercase tracking-wider">
               {t.subtitle}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-textMuted hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-gradient-to-b from-black/20 to-transparent">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#1e293b] border border-white/10 text-gray-100 rounded-bl-none'}`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
             <div className="bg-[#1e293b] border border-white/10 rounded-2xl rounded-bl-none p-4 flex gap-2 items-center shadow-lg">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce animation-delay-200"></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce animation-delay-500"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Tools & Input */}
      <div className="p-4 bg-[#0f172a] border-t border-white/10">
        <div className="flex gap-2 mb-4">
           <button 
             onClick={() => setUseThinking(!useThinking)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap
             ${useThinking ? 'bg-purple-600 text-white border-purple-400' : 'bg-[#1e293b] border-white/5 text-gray-400 hover:bg-[#334155]'}`}
           >
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             {t.thinking}
           </button>
        </div>
        
        <div className="flex gap-3">
           <input 
             type="text" 
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
             placeholder={t.placeholder}
             className="flex-1 bg-[#050b14] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner placeholder-gray-600"
           />
           <button 
             onClick={sendMessage}
             disabled={isLoading}
             className="p-3.5 rounded-xl bg-blue-600 text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
           >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
           </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
