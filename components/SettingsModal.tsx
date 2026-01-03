
import React from 'react';
import { GlobalSettings, Language } from '../types';

interface SettingsModalProps {
  settings: GlobalSettings;
  onSettingsChange: (s: GlobalSettings) => void;
  lang: Language;
  onLangChange: (l: Language) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSettingsChange, lang, onLangChange, onClose }) => {
  const t = {
      title: lang === 'uk' ? 'Налаштування Системи' : lang === 'ru' ? 'Настройки Системы' : 'System Settings',
      thresholds: lang === 'uk' ? 'Пороги Напруги' : lang === 'ru' ? 'Пороги Напряжения' : 'Voltage Thresholds',
      interface: lang === 'uk' ? 'Інтерфейс' : lang === 'ru' ? 'Интерфейс' : 'Interface',
      vmin: lang === 'uk' ? 'Мінімум (В)' : lang === 'ru' ? 'Минимальное (В)' : 'Minimum (V)',
      vmax: lang === 'uk' ? 'Максимум (В)' : lang === 'ru' ? 'Максимальное (В)' : 'Maximum (V)',
      language: lang === 'uk' ? 'Мова' : lang === 'ru' ? 'Язык' : 'Language',
      nominal: lang === 'uk' ? 'Номінал' : lang === 'ru' ? 'Номинал' : 'Nominal Voltage',
      save: lang === 'uk' ? 'Зберегти та Закрити' : lang === 'ru' ? 'Сохранить и Закрыть' : 'Save & Close',
      timezone: lang === 'uk' ? 'Часовий пояс' : lang === 'ru' ? 'Часовой пояс' : 'Timezone',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
       <div className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
           
           <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
               <h2 className="font-bold text-white flex items-center gap-2">
                   <svg className="w-5 h-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   {t.title}
               </h2>
               <button onClick={onClose} className="text-textMuted hover:text-white transition-colors">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
           </div>

           <div className="p-6 space-y-6">
               
               {/* Thresholds */}
               <div className="space-y-4">
                   <h3 className="text-xs uppercase font-bold text-accent tracking-wider border-b border-white/5 pb-2">{t.thresholds}</h3>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                           <label className="text-xs text-textMuted">{t.vmin}</label>
                           <input 
                             type="number" 
                             value={settings.vmin} 
                             onChange={(e) => onSettingsChange({...settings, vmin: Number(e.target.value)})}
                             className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-accent outline-none"
                           />
                       </div>
                       <div className="space-y-2">
                           <label className="text-xs text-textMuted">{t.vmax}</label>
                           <input 
                             type="number" 
                             value={settings.vmax} 
                             onChange={(e) => onSettingsChange({...settings, vmax: Number(e.target.value)})}
                             className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-accent outline-none"
                           />
                       </div>
                   </div>
                   
                   <div className="flex justify-between items-center text-xs bg-white/5 p-2 rounded border border-white/5">
                       <span className="text-textMuted">{t.nominal}:</span>
                       <span className="text-white font-mono font-bold">230 V</span>
                   </div>
               </div>

               {/* Interface */}
               <div className="space-y-4">
                   <h3 className="text-xs uppercase font-bold text-purple-400 tracking-wider border-b border-white/5 pb-2">{t.interface}</h3>
                   
                   {/* Timezone Selection */}
                   <div className="space-y-2">
                       <label className="text-xs text-textMuted">{t.timezone}</label>
                       <select
                         value={settings.timezone}
                         onChange={(e) => onSettingsChange({...settings, timezone: e.target.value})}
                         className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-purple-400 outline-none cursor-pointer"
                       >
                           <option value="Europe/Kyiv">🇺🇦 Europe/Kyiv (UTC+2/3)</option>
                           <option value="UTC">🌍 UTC (Universal)</option>
                           <option value="Europe/London">🇬🇧 Europe/London (GMT/BST)</option>
                           <option value="Europe/Warsaw">🇵🇱 Europe/Warsaw (CET/CEST)</option>
                           <option value="America/New_York">🇺🇸 America/New_York (EST/EDT)</option>
                       </select>
                   </div>

                   {/* Language Selection */}
                   <div className="space-y-2">
                       <label className="text-xs text-textMuted">{t.language}</label>
                       <div className="grid grid-cols-3 gap-2">
                           <button 
                             onClick={() => onLangChange('uk')}
                             className={`px-2 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${lang === 'uk' ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-textMuted hover:bg-white/5'}`}
                           >
                               <span>🇺🇦</span> Українська
                           </button>
                           <button 
                             onClick={() => onLangChange('ru')}
                             className={`px-2 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${lang === 'ru' ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-textMuted hover:bg-white/5'}`}
                           >
                               Русский
                           </button>
                           <button 
                             onClick={() => onLangChange('en')}
                             className={`px-2 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${lang === 'en' ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-textMuted hover:bg-white/5'}`}
                           >
                               <span>🇬🇧</span> English
                           </button>
                       </div>
                   </div>
               </div>

           </div>

           <div className="p-4 border-t border-white/10 bg-black/20">
               <button 
                 onClick={onClose}
                 className="w-full py-3 bg-accent hover:bg-accentHover text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
               >
                   {t.save}
               </button>
           </div>

       </div>
    </div>
  );
};

export default SettingsModal;
