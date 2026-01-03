import React, { useState, useRef, useEffect } from 'react';
import { AnalysisStats, VoltageTriplet, Language } from '../types';
import VoltageChart from './VoltageChart';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ReportGeneratorProps {
  stats: AnalysisStats;
  data: VoltageTriplet[];
  lang: Language;
  vmin: number;
  vmax: number;
  timezone: string;
  onClose: () => void;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ stats, data, lang: appLang, vmin, vmax, timezone, onClose }) => {
  const [includeStats, setIncludeStats] = useState(true);
  const [includeChart, setIncludeChart] = useState(true); 
  const [includeLog, setIncludeLog] = useState(false);
  const [engineerName, setEngineerName] = useState('');
  
  // New States
  const [reportLang, setReportLang] = useState<Language>(appLang);
  const [showPreview, setShowPreview] = useState(false);
  const [aiConclusion, setAiConclusion] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const t = {
    title: reportLang === 'uk' ? 'Конфігуратор Звіту' : reportLang === 'ru' ? 'Конфигуратор отчета' : 'Report Configuration',
    reportHeader: reportLang === 'uk' ? 'ПРОТОКОЛ АНАЛІЗУ ЯКОСТІ ЕЛЕКТРОЕНЕРГІЇ' : reportLang === 'ru' ? 'ПРОТОКОЛ АНАЛИЗА КАЧЕСТВА ЭЛЕКТРОЭНЕРГИИ' : 'POWER QUALITY ANALYSIS PROTOCOL',
    engineer: reportLang === 'uk' ? 'Інженер' : reportLang === 'ru' ? 'Инженер' : 'Engineer',
    sections: reportLang === 'uk' ? 'Розділи' : reportLang === 'ru' ? 'Разделы' : 'Sections',
    secStats: reportLang === 'uk' ? '1. Зведені показники' : reportLang === 'ru' ? '1. Сводные показатели' : '1. Summary Statistics',
    secChart: reportLang === 'uk' ? '2. Візуалізація' : reportLang === 'ru' ? '2. Визуализация' : '2. Visualization',
    secLog: reportLang === 'uk' ? '3. Витяг з журналу' : reportLang === 'ru' ? '3. Выписка из журнала' : '3. Log Extract',
    secConclusion: reportLang === 'uk' ? '4. Висновок' : reportLang === 'ru' ? '4. Заключение' : '4. Conclusion',
    downloadCsv: reportLang === 'uk' ? 'Завантажити CSV' : reportLang === 'ru' ? 'Скачать CSV' : 'Download CSV',
    downloadPdf: reportLang === 'uk' ? 'Завантажити PDF' : reportLang === 'ru' ? 'Скачать PDF' : 'Download PDF',
    previewBtn: reportLang === 'uk' ? 'Попередній перегляд' : reportLang === 'ru' ? 'Предпросмотр' : 'Preview',
    close: reportLang === 'uk' ? 'Закрити' : reportLang === 'ru' ? 'Закрыть' : 'Close',
    back: reportLang === 'uk' ? 'Назад' : reportLang === 'ru' ? 'Назад' : 'Back',
    printNow: reportLang === 'uk' ? 'Друкувати Протокол' : reportLang === 'ru' ? 'Распечатать Протокол' : 'Print Protocol',
    desc: reportLang === 'uk' ? 'Налаштування параметрів вихідного документу.' : reportLang === 'ru' ? 'Настройка параметров выходного документа.' : 'Configure output document parameters.',
    generatedBy: 'Voltage Analyzer Pro',
    date: reportLang === 'uk' ? 'Дата складання' : reportLang === 'ru' ? 'Дата составления' : 'Date of Issue',
    duration: reportLang === 'uk' ? 'Період вимірювань' : reportLang === 'ru' ? 'Период измерений' : 'Measurement Period',
    risk: reportLang === 'uk' ? 'Оцінка ризиків' : reportLang === 'ru' ? 'Оценка рисков' : 'Risk Assessment',
    totalEvents: reportLang === 'uk' ? 'Аномалій' : reportLang === 'ru' ? 'Аномалий' : 'Anomalies',
    maxDelta: reportLang === 'uk' ? 'Макс. дисбаланс' : reportLang === 'ru' ? 'Макс. дисбаланс' : 'Max Imbalance',
    phase: reportLang === 'uk' ? 'Фаза' : reportLang === 'ru' ? 'Фаза' : 'Phase',
    min: reportLang === 'uk' ? 'Мін.' : reportLang === 'ru' ? 'Мин.' : 'Min',
    max: reportLang === 'uk' ? 'Макс.' : reportLang === 'ru' ? 'Макс.' : 'Max',
    avg: reportLang === 'uk' ? 'Сер.' : reportLang === 'ru' ? 'Сред.' : 'Avg',
    time: reportLang === 'uk' ? 'Час' : reportLang === 'ru' ? 'Время' : 'Time',
    status: reportLang === 'uk' ? 'Статус' : reportLang === 'ru' ? 'Статус' : 'Status',
    logNote: reportLang === 'uk' ? 'Лог скорочено. Повні дані див. в електронному додатку.' : reportLang === 'ru' ? 'Лог усечен. Полные данные см. в электронном приложении.' : 'Log truncated. See digital attachment for full data.',
    aiBtn: reportLang === 'uk' ? 'Згенерувати висновок (AI)' : reportLang === 'ru' ? 'Сгенерировать заключение (AI)' : 'Generate Conclusion (AI)',
    aiPrompt: reportLang === 'uk' ? 'Аналіз даних...' : reportLang === 'ru' ? 'Анализ данных...' : 'Analyzing data...',
    signature: reportLang === 'uk' ? 'Підпис' : reportLang === 'ru' ? 'Подпись' : 'Signature',
    approvedBy: reportLang === 'uk' ? 'Затвердив' : reportLang === 'ru' ? 'Утвердил' : 'Approved By',
    repLangLabel: reportLang === 'uk' ? 'Мова звіту' : reportLang === 'ru' ? 'Язык отчета' : 'Report Language',
    standards: reportLang === 'uk' ? 'Норми: ДСТУ EN 50160:2014 (230В ±10%)' : reportLang === 'ru' ? 'Нормы: 230В ±10% (207В - 253В)' : 'Standards: 230V ±10% (207V - 253V)',
    facts: reportLang === 'uk' ? 'Факти' : reportLang === 'ru' ? 'Факты' : 'Facts',
  };

  const handleDownloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,L1 (V),L2 (V),L3 (V),Delta (V),Status\n";
    data.forEach(row => {
      const time = new Date(row.ts).toISOString();
      const l1 = row.L1?.toFixed(2) || '';
      const l2 = row.L2?.toFixed(2) || '';
      const l3 = row.L3?.toFixed(2) || '';
      const delta = row.delta.toFixed(2);
      csvContent += `${time},${l1},${l2},${l3},${delta},${row.status}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `voltage_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
      const element = document.getElementById('printable-content');
      if (!element) {
          // If we are in the main modal (not preview), we need to show preview to capture it
          // Or we could implement a hidden render, but for simplicity let's force preview mode first
          // to ensure charts render correctly.
          setShowPreview(true);
          // Wait for render
          setTimeout(() => handleDownloadPDF(), 1000);
          return;
      }

      setIsDownloadingPdf(true);
      try {
          const canvas = await html2canvas(element, { 
              scale: 2,
              backgroundColor: '#ffffff',
              logging: false
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`VoltageReport_${new Date().toISOString().slice(0,10)}.pdf`);
      } catch (err) {
          console.error("PDF generation failed:", err);
          alert("Failed to generate PDF. Please try again.");
      } finally {
          setIsDownloadingPdf(false);
      }
  };

  const triggerPrint = () => {
    window.print();
  };

  const generateAIConclusion = async () => {
    setIsGeneratingAI(true);
    try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Construct data summary string to reuse
        const dataSummary = `
           - Duration: ${stats.durationHours.toFixed(1)} h
           - Total Violation Events: ${stats.cntUnder + stats.cntOver}
           - Imbalance Events: ${stats.cntImbalance}
           - Max Imbalance: ${stats.maxDelta.toFixed(1)} V
           - Phase L1 (min/max): ${stats.phases.L1.min.toFixed(1)}/${stats.phases.L1.max.toFixed(1)} V
           - Phase L2 (min/max): ${stats.phases.L2.min.toFixed(1)}/${stats.phases.L2.max.toFixed(1)} V
           - Phase L3 (min/max): ${stats.phases.L3.min.toFixed(1)}/${stats.phases.L3.max.toFixed(1)} V
           - Thresholds: ${vmin}V - ${vmax}V
        `;

        let prompt = '';

        if (reportLang === 'uk') {
            prompt = `Напиши професійний технічний висновок для протоколу аналізу якості електроенергії (стандарт ДСТУ EN 50160).
               Дані:
               ${dataSummary}
               
               Структура:
               1. Загальна оцінка стабільності.
               2. Виявлені проблеми (якщо є).
               3. Рекомендації щодо покращення якості електропостачання.
               Пиши українською мовою, професійно, лаконічно, без Markdown форматування.`;
        } else if (reportLang === 'ru') {
            prompt = `Напиши профессиональное техническое заключение для протокола анализа качества электроэнергии.
               Данные:
               ${dataSummary}
               
               Структура:
               1. Общая оценка стабильности.
               2. Выявленные проблемы (если есть).
               3. Рекомендации по улучшению качества электроснабжения.
               Пиши на русском языке, профессионально, лаконично, без Markdown форматирования.`;
        } else {
            prompt = `Write a professional technical conclusion for a Power Quality Analysis Protocol.
               Data:
               ${dataSummary}
               
               Structure:
               1. General stability assessment.
               2. Identified issues (if any).
               3. Recommendations for improving power quality.
               Write in English, professional tone, concise, without Markdown formatting.`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] }
        });

        setAiConclusion(response.text || '');
    } catch (e) {
        console.error(e);
        setAiConclusion("Error generating conclusion. Please check API connection.");
    } finally {
        setIsGeneratingAI(false);
    }
  };

  // --------------------------------------------------------------------------------
  // RENDER: PRINT PREVIEW MODE (Visible A4 Sheet)
  // --------------------------------------------------------------------------------
  if (showPreview) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col h-screen overflow-hidden">
        {/* Toolbar (Hidden when printing) */}
        <div className="h-16 bg-[#0f172a] border-b border-white/10 flex items-center justify-between px-6 print:hidden shadow-xl z-50">
            <div className="flex items-center gap-4">
                <button onClick={() => setShowPreview(false)} className="flex items-center gap-2 text-textMuted hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    {t.back}
                </button>
                <div className="h-6 w-px bg-white/10"></div>
                <h2 className="font-bold text-white">{t.reportHeader}</h2>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPdf}
                    className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all"
                >
                     {isDownloadingPdf ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     )}
                    {t.downloadPdf}
                </button>
                <button 
                    onClick={triggerPrint}
                    className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accentHover text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    {t.printNow}
                </button>
            </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-800 p-8 flex justify-center print:p-0 print:overflow-visible print:bg-white print:block">
            {/* A4 Sheet Container */}
            <div 
                id="printable-content"
                className="bg-white text-black w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl origin-top print:shadow-none print:w-full print:p-0 print:m-0 flex flex-col justify-between"
            >
                 <div className="flex flex-col font-sans text-black">
                     {/* Header */}
                     <div className="border-b-4 border-black pb-4 mb-8">
                         <div className="flex justify-between items-end mb-4">
                             <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-bold text-xl rounded">V</div>
                             <div className="text-right">
                                 <div className="text-xs text-gray-500 uppercase tracking-widest">{t.generatedBy}</div>
                                 <div className="font-bold text-lg">{new Date().toLocaleDateString('uk-UA')}</div>
                             </div>
                         </div>
                         <h1 className="text-2xl font-black uppercase tracking-tight text-center">{t.reportHeader}</h1>
                     </div>

                     {/* Info Block */}
                     <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                         <div className="space-y-2">
                             <div className="flex justify-between border-b border-gray-300 pb-1">
                                 <span className="text-gray-600">{t.engineer}:</span>
                                 <span className="font-bold uppercase">{engineerName || "________________"}</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-300 pb-1">
                                 <span className="text-gray-600">{t.date}:</span>
                                 <span className="font-medium">{new Date().toLocaleString('uk-UA', {timeZone: timezone})}</span>
                             </div>
                         </div>
                         <div className="space-y-2">
                            <div className="flex justify-between border-b border-gray-300 pb-1">
                                 <span className="text-gray-600">{t.duration}:</span>
                                 <span className="font-medium">{stats.durationHours.toFixed(2)} h</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-300 pb-1">
                                 <span className="text-gray-600">{t.risk}:</span>
                                 <span className={`font-bold uppercase px-2 text-white ${stats.riskLevel === 'high' ? 'bg-red-600' : stats.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-600'}`}>{stats.riskLevel}</span>
                             </div>
                         </div>
                     </div>

                     <div className="text-xs text-center text-gray-500 mb-8 italic border border-gray-200 p-2 rounded bg-gray-50">
                        {t.standards}
                     </div>
                     
                     {includeStats && (
                         <div className="mb-8 break-inside-avoid">
                             <h2 className="font-bold text-lg border-l-4 border-blue-600 pl-3 mb-4 uppercase">{t.secStats}</h2>
                             
                             <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
                                 <thead>
                                     <tr className="bg-gray-100">
                                         <th className="border border-gray-300 p-2 text-left">{t.phase}</th>
                                         <th className="border border-gray-300 p-2 text-right">{t.min} (V)</th>
                                         <th className="border border-gray-300 p-2 text-right">{t.max} (V)</th>
                                         <th className="border border-gray-300 p-2 text-right">{t.avg} (V)</th>
                                         <th className="border border-gray-300 p-2 text-right">{t.status}</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {(['L1', 'L2', 'L3'] as const).map(ph => (
                                         <tr key={ph}>
                                            <td className="border border-gray-300 p-2 font-bold">{ph}</td>
                                            <td className={`border border-gray-300 p-2 text-right ${stats.phases[ph].min < vmin ? 'text-red-600 font-bold' : ''}`}>{stats.phases[ph].min.toFixed(1)}</td>
                                            <td className={`border border-gray-300 p-2 text-right ${stats.phases[ph].max > vmax ? 'text-red-600 font-bold' : ''}`}>{stats.phases[ph].max.toFixed(1)}</td>
                                            <td className="border border-gray-300 p-2 text-right">{stats.phases[ph].avg.toFixed(1)}</td>
                                            <td className="border border-gray-300 p-2 text-right text-xs">
                                                {stats.phases[ph].underCount > 0 ? `${stats.phases[ph].underCount} Low` : ''} 
                                                {stats.phases[ph].overCount > 0 ? ` ${stats.phases[ph].overCount} High` : ''}
                                                {stats.phases[ph].underCount === 0 && stats.phases[ph].overCount === 0 ? 'OK' : ''}
                                            </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>

                             <div className="bg-gray-50 p-4 border border-gray-200 rounded text-sm">
                                 <h4 className="font-bold mb-2 border-b border-gray-300 inline-block">{t.facts}</h4>
                                 <ul className="list-disc list-inside space-y-1 text-gray-700">
                                     <li>{t.maxDelta}: <b>{stats.maxDelta.toFixed(1)} V</b></li>
                                     <li>{t.totalEvents}: <b>{stats.cntUnder + stats.cntOver + stats.cntImbalance}</b></li>
                                 </ul>
                             </div>
                         </div>
                     )}

                     {includeChart && (
                        <div className="mb-8 break-inside-avoid">
                            <h2 className="font-bold text-lg border-l-4 border-blue-600 pl-3 mb-4 uppercase">{t.secChart}</h2>
                            <div className="border border-gray-300 bg-white p-2">
                                <VoltageChart 
                                    data={data}
                                    vmin={vmin}
                                    vmax={vmax}
                                    lang={reportLang}
                                    timezone={timezone}
                                    selectedTimestamp={null}
                                    printMode={true} 
                                />
                            </div>
                        </div>
                     )}

                     {(aiConclusion || includeLog) && (
                        <div className="break-inside-avoid">
                             <h2 className="font-bold text-lg border-l-4 border-blue-600 pl-3 mb-4 uppercase">{t.secConclusion}</h2>
                             
                             {aiConclusion && (
                                 <div className="bg-blue-50 p-6 rounded border border-blue-100 mb-6 text-sm text-justify leading-relaxed whitespace-pre-wrap font-serif">
                                     {aiConclusion}
                                 </div>
                             )}

                             <div className="flex justify-between mt-16 pt-8 border-t border-black break-inside-avoid">
                                 <div className="text-center w-1/3">
                                     <div className="border-b border-black mb-2 pb-8"></div>
                                     <div className="text-xs uppercase">{t.engineer}</div>
                                 </div>
                                 <div className="text-center w-1/3">
                                     <div className="border-b border-black mb-2 pb-8"></div>
                                     <div className="text-xs uppercase">{t.approvedBy}</div>
                                 </div>
                                 <div className="text-center w-1/5">
                                     <div className="border-b border-black mb-2 pb-8"></div>
                                     <div className="text-xs uppercase">{t.date}</div>
                                 </div>
                             </div>
                        </div>
                     )}
                     
                     {includeLog && (
                         <div className="break-before-page mt-8">
                              <h2 className="font-bold text-lg border-l-4 border-blue-600 pl-3 mb-4 uppercase">{t.secLog}</h2>
                              <table className="w-full text-xs text-left border-collapse border border-gray-300">
                                  <thead>
                                      <tr className="bg-gray-100">
                                          <th className="border border-gray-300 p-1">{t.time}</th>
                                          <th className="border border-gray-300 p-1">L1</th>
                                          <th className="border border-gray-300 p-1">L2</th>
                                          <th className="border border-gray-300 p-1">L3</th>
                                          <th className="border border-gray-300 p-1">{t.status}</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {data.slice(0, 100).map((row, i) => (
                                          <tr key={i}>
                                              <td className="border border-gray-300 p-1">{new Date(row.ts).toLocaleTimeString('uk-UA', {timeZone: timezone})}</td>
                                              <td className="border border-gray-300 p-1">{row.L1?.toFixed(1)}</td>
                                              <td className="border border-gray-300 p-1">{row.L2?.toFixed(1)}</td>
                                              <td className="border border-gray-300 p-1">{row.L3?.toFixed(1)}</td>
                                              <td className="border border-gray-300 p-1">{row.status !== 'ok' ? row.status.toUpperCase() : 'OK'}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                              <div className="mt-2 text-xs italic text-gray-500">{t.logNote}</div>
                         </div>
                     )}
                </div>
                
                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-300 text-[10px] text-gray-400 flex justify-between uppercase">
                    <span>Generated by {t.generatedBy}</span>
                    <span>Page 1</span>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------------
  // RENDER: CONFIGURATION MODAL
  // --------------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-all" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl p-6 animate-fade-in-up flex flex-col md:flex-row gap-6">
        
        {/* Left Col: Controls */}
        <div className="flex-1 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white">{t.title}</h2>
              <p className="text-textMuted text-xs">{t.desc}</p>
            </div>

            {/* Language Selector */}
            <div>
                <label className="block text-xs font-bold text-textMuted uppercase mb-2">{t.repLangLabel}</label>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setReportLang('uk')} 
                        className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${reportLang === 'uk' ? 'bg-accent border-accent text-white' : 'border-white/10 text-textMuted hover:bg-white/5'}`}
                    >
                        Українська
                    </button>
                    <button 
                        onClick={() => setReportLang('ru')} 
                        className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${reportLang === 'ru' ? 'bg-accent border-accent text-white' : 'border-white/10 text-textMuted hover:bg-white/5'}`}
                    >
                        Русский
                    </button>
                    <button 
                        onClick={() => setReportLang('en')} 
                        className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${reportLang === 'en' ? 'bg-accent border-accent text-white' : 'border-white/10 text-textMuted hover:bg-white/5'}`}
                    >
                        English
                    </button>
                </div>
            </div>

            {/* Engineer Field */}
            <div>
               <label className="block text-xs font-bold text-textMuted uppercase mb-2">{t.engineer}</label>
               <input 
                 type="text" 
                 value={engineerName}
                 onChange={(e) => setEngineerName(e.target.value)}
                 placeholder="Ім'я Прізвище"
                 className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-accent outline-none"
               />
            </div>

            {/* AI Generator */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <label className="block text-xs font-bold text-purple-400 uppercase mb-2">AI Assistant</label>
                <button 
                    onClick={generateAIConclusion}
                    disabled={isGeneratingAI}
                    className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                    {isGeneratingAI ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                    {isGeneratingAI ? t.aiPrompt : t.aiBtn}
                </button>
                {aiConclusion && (
                    <div className="mt-3 text-[10px] text-gray-400 bg-black/20 p-2 rounded max-h-20 overflow-hidden text-ellipsis whitespace-nowrap">
                        {aiConclusion}
                    </div>
                )}
            </div>
        </div>

        {/* Right Col: Toggles & Actions */}
        <div className="flex-1 flex flex-col justify-between">
           <div>
              <label className="block text-xs font-bold text-textMuted uppercase mb-3">{t.sections}</label>
              <div className="space-y-3">
                 <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="checkbox" checked={includeStats} onChange={e => setIncludeStats(e.target.checked)} className="accent-accent w-5 h-5" />
                    <span className="text-sm font-medium text-white">{t.secStats}</span>
                 </label>
                 
                 <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="checkbox" checked={includeChart} onChange={e => setIncludeChart(e.target.checked)} className="accent-accent w-5 h-5" />
                    <span className="text-sm font-medium text-white">{t.secChart}</span>
                 </label>

                 <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="checkbox" checked={!!aiConclusion} disabled className="accent-accent w-5 h-5 opacity-50" />
                    <span className="text-sm font-medium text-white">{t.secConclusion} ({aiConclusion ? 'Ready' : 'Pending'})</span>
                 </label>

                 <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="checkbox" checked={includeLog} onChange={e => setIncludeLog(e.target.checked)} className="accent-accent w-5 h-5" />
                    <span className="text-sm font-medium text-white">{t.secLog}</span>
                 </label>
              </div>
           </div>

           <div className="space-y-3 mt-8">
              <div className="flex gap-2">
                 <button 
                    onClick={() => setShowPreview(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white hover:bg-accentHover transition-all font-semibold text-sm shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                 >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                     {t.previewBtn}
                 </button>
                 <button 
                    onClick={handleDownloadPDF}
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                    title={t.downloadPdf}
                 >
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 </button>
              </div>
              
              <button 
                onClick={handleDownloadCSV}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-semibold text-sm"
              >
                 <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 {t.downloadCsv}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;