
import React, { useState, useMemo } from 'react';
import { parseLogFile, evaluateStatus } from './services/parser';
import { FileData, GlobalSettings, AnalysisStats, PhaseDetailedStats, Language } from './types';
import FileUploader from './components/FileUploader';
import VoltageChart from './components/VoltageChart';
import DataTable from './components/DataTable';
import AnalysisReport from './components/AnalysisReport';
import AIAssistant from './components/AIAssistant';
import ReportGenerator from './components/ReportGenerator';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings>({ 
    vmin: 207, 
    vmax: 253, 
    timezone: 'Europe/Kyiv' 
  });
  
  const [lang, setLang] = useState<Language>('uk');
  
  // Interaction State
  const [zoomRange, setZoomRange] = useState<{start: number, end: number} | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);

  // Modal States
  const [showAssistant, setShowAssistant] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // New modal state

  // Handle file ingestion
  const handleUpload = async (uploadedFiles: File[]) => {
    setIsLoading(true);
    setTimeout(async () => {
        try {
            const results: FileData[] = [];
            for (const f of uploadedFiles) {
                const data = await parseLogFile(f, settings.vmin, settings.vmax);
                results.push(data);
            }
            setFiles(prev => [...prev, ...results]);
        } catch (e) {
            console.error(e);
            alert('Error parsing file: ' + (e as any).message);
        } finally {
            setIsLoading(false);
        }
    }, 100);
  };

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  // Flatten all data and re-evaluate against current settings
  const allData = useMemo(() => {
    return files
      .filter(f => f.enabled)
      .flatMap(f => f.triplets)
      .map(t => {
          // Re-evaluate status based on current settings
          const { status, deviationDetails } = evaluateStatus(t, settings.vmin, settings.vmax);
          return { ...t, status, deviationDetails };
      })
      .sort((a, b) => a.ts - b.ts);
  }, [files, settings.vmin, settings.vmax]);

  // Compute stats including parsing errors
  const analysisStats: AnalysisStats = useMemo(() => {
    const initPhaseStats = (): PhaseDetailedStats => ({ min: 999, max: 0, avg: 0, underCount: 0, overCount: 0, zeroCount: 0 });
    
    // Sum up parsing errors from all enabled files
    const totalParsingErrors = files
        .filter(f => f.enabled)
        .reduce((sum, f) => sum + (f.parsingErrors ? f.parsingErrors.length : 0), 0);

    const s: AnalysisStats = {
      totalPoints: allData.length,
      startTime: allData.length > 0 ? allData[0].ts : null,
      endTime: allData.length > 0 ? allData[allData.length - 1].ts : null,
      durationHours: 0,
      cntUnder: 0,
      cntOver: 0,
      cntImbalance: 0,
      cntDeepDip: 0,
      cntInvalidDates: totalParsingErrors, // Store errors in stats
      maxDelta: 0,
      riskLevel: 'low',
      phases: { L1: initPhaseStats(), L2: initPhaseStats(), L3: initPhaseStats() }
    };

    if (allData.length === 0) return s;

    if (s.startTime && s.endTime) {
        s.durationHours = (s.endTime - s.startTime) / (1000 * 60 * 60);
    }

    const sums = { L1: 0, L2: 0, L3: 0 };
    const counts = { L1: 0, L2: 0, L3: 0 };

    for (const t of allData) {
      if (t.status === 'under') s.cntUnder++;
      if (t.status === 'over') s.cntOver++;
      if (t.status === 'imbalance') s.cntImbalance++;
      if (t.delta > s.maxDelta) s.maxDelta = t.delta;

      (['L1', 'L2', 'L3'] as const).forEach(ph => {
        const val = t[ph];
        if (val !== null) {
            const ps = s.phases[ph];
            if (val < ps.min) ps.min = val;
            if (val > ps.max) ps.max = val;
            if (val < settings.vmin) ps.underCount++;
            if (val > settings.vmax) ps.overCount++;
            if (val < 190) s.cntDeepDip++;
            
            sums[ph] += val;
            counts[ph]++;
        }
      });
    }

    (['L1', 'L2', 'L3'] as const).forEach(ph => {
        if (counts[ph] > 0) s.phases[ph].avg = sums[ph] / counts[ph];
        if (s.phases[ph].min === 999) s.phases[ph].min = 0;
    });

    const totalViolations = s.cntUnder + s.cntOver + s.cntImbalance;
    // Risk level increases if data is corrupted
    if (s.cntDeepDip > 0 || s.maxDelta > 30 || s.cntInvalidDates > 100) s.riskLevel = 'high';
    else if (totalViolations > 50 || s.cntInvalidDates > 10) s.riskLevel = 'medium';
    else s.riskLevel = 'low';

    return s;
  }, [allData, files, settings]);

  // Aggregate parsing errors for UI warnings (e.g., suspicious timestamps like year 2000)
  const parsingErrorAgg = useMemo(() => {
    const errors = files
      .filter(f => f.enabled)
      .flatMap(f => (f.parsingErrors ? f.parsingErrors : []));
    const suspicious = errors.filter(e => String(e).startsWith('Suspicious timestamp'));
    const suspiciousSamples = Array.from(new Set(suspicious)).slice(0, 5);
    return { errors, suspiciousCount: suspicious.length, suspiciousSamples };
  }, [files]);

  const handleChartRowClick = (ts: number) => {
      setSelectedTimestamp(ts);
      const chartEl = document.getElementById('main-chart');
      if(chartEl) chartEl.scrollIntoView({behavior: 'smooth', block: 'center'});
  };

  const t = {
      title: 'Voltage Analyzer',
      addFile: lang === 'uk' ? '+ Додати' : lang === 'ru' ? '+ Добавить' : '+ Add',
      clear: lang === 'uk' ? 'Очистити' : lang === 'ru' ? 'Очистить' : 'Clear',
      report: lang === 'uk' ? 'Звіт' : lang === 'ru' ? 'Отчет' : 'Report',
      settings: lang === 'uk' ? 'Налаштування' : 'Settings',
  };

  if (files.length === 0) {
    return (
      <>
        <FileUploader onUpload={handleUpload} isLoading={isLoading} />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-10 bg-background text-textMain font-sans relative flex flex-col">
      
      {/* 1. COMPACT HEADER */}
      <nav className="h-14 border-b border-white/10 bg-[#020408]/90 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-40 shadow-xl">
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">V</div>
              
               <div className="flex items-center gap-2 overflow-x-auto max-w-[500px] no-scrollbar ml-2">
                  {files.map(f => (
                      <div key={f.name} className={`px-2 py-0.5 rounded-md border text-[10px] flex items-center gap-2 whitespace-nowrap ${f.parsingErrors?.length > 0 ? 'bg-red-500/10 border-red-500 text-red-200' : 'bg-white/5 border-white/10 text-textMuted'}`}>
                          {f.name}
                          {f.parsingErrors?.length > 0 && <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">!</span>}
                          <button onClick={() => removeFile(f.name)} className="hover:text-danger">×</button>
                      </div>
                  ))}
                  
                  <label className="cursor-pointer text-accent text-xs font-bold hover:text-white transition-colors whitespace-nowrap bg-white/5 px-2 py-0.5 rounded border border-dashed border-white/20">{t.addFile}</label>
                  <input type="file" multiple className="hidden" onChange={e => e.target.files && handleUpload(Array.from(e.target.files))} />
              </div>
          </div>

          <div className="flex items-center gap-3">
              <button onClick={() => setShowReport(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-colors">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                   {t.report}
              </button>

              <button onClick={() => setShowAssistant(true)} className="p-2 hover:bg-purple-600/20 text-purple-300 rounded-lg transition-colors border border-transparent hover:border-purple-500/30">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </button>

              {/* Settings Gear Button */}
              <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-textMuted hover:text-white rounded-lg transition-colors border border-transparent hover:border-white/10">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   <span className="hidden md:inline text-xs font-bold">{t.settings}</span>
              </button>

              <button onClick={() => setFiles([])} className="text-xs font-bold text-danger hover:bg-danger/10 px-3 py-1.5 rounded transition-colors border border-danger/20">
                  {t.clear}
              </button>
          </div>
      </nav>

      <main className="max-w-[1920px] mx-auto p-4 space-y-4 w-full flex-1 flex flex-col">
          
          {/* 2. SUMMARY DASHBOARD (FULL WIDTH) */}
          <section className="animate-fade-in-up">
              <AnalysisReport stats={analysisStats} data={allData} lang={lang} timezone={settings.timezone} viewMode="full" />
          </section>

          {/* 3. CHART SECTION (FULL WIDTH) */}
          <section className="min-h-[500px] md:min-h-[600px] flex flex-col animate-fade-in-up animation-delay-200" id="main-chart">
              <VoltageChart 
                  data={allData} 
                  vmin={settings.vmin} 
                  vmax={settings.vmax} 
                  lang={lang}
                  timezone={settings.timezone}
                  selectedTimestamp={selectedTimestamp}
                  parsingErrorCount={analysisStats.cntInvalidDates} // PASS THE ERROR COUNT
                  badTimestampCount={parsingErrorAgg.suspiciousCount}
                  badTimestampSamples={parsingErrorAgg.suspiciousSamples}
                  onZoomChange={setZoomRange}
              />
          </section>

          {/* 4. DATA LOG (BOTTOM) */}
          <section className="flex-1 flex flex-col min-h-[500px] animate-fade-in-up animation-delay-500">
              <DataTable data={allData} lang={lang} timezone={settings.timezone} onRowClick={handleChartRowClick} />
          </section>

          {/* 5. INCIDENTS (VERY BOTTOM) */}
          {parsingErrorAgg.errors.length > 0 && (
            <section id="incidents" className="flex-1 flex flex-col min-h-[220px] animate-fade-in-up animation-delay-700">
              <div className="bg-surface/40 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white font-bold text-base">Incidents</div>
                  <div className="text-textMuted text-xs font-mono">{parsingErrorAgg.errors.length} events</div>
                </div>
                <div className="mt-3 space-y-2">
                  {Array.from(new Set(parsingErrorAgg.errors)).slice(0, 50).map((e, i) => (
                    <div key={i} className="bg-black/10 border border-white/10 rounded-xl p-2 text-[11px] text-textMuted font-mono">
                      {e}
                    </div>
                  ))}
                </div>
                {parsingErrorAgg.errors.length > 50 && (
                  <div className="mt-3 text-[11px] text-textMuted">
                    Showing first 50 unique incidents.
                  </div>
                )}
              </div>
            </section>
          )}

      </main>

      {/* Overlays */}
      {showSettings && (
          <SettingsModal 
            settings={settings} 
            onSettingsChange={setSettings} 
            lang={lang} 
            onLangChange={setLang} 
            onClose={() => setShowSettings(false)} 
          />
      )}
      
      {showAssistant && <AIAssistant stats={analysisStats} lang={lang} onClose={() => setShowAssistant(false)} />}
      
      {showReport && (
        <ReportGenerator 
            stats={analysisStats} 
            data={allData} 
            lang={lang} 
            vmin={settings.vmin}
            vmax={settings.vmax}
            timezone={settings.timezone}
            onClose={() => setShowReport(false)} 
        />
      )}
      
      {isLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent shadow-[0_0_30px_rgba(59,130,246,0.5)]"></div>
          </div>
      )}

    </div>
  );
};

export default App;
