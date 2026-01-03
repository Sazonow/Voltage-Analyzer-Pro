
import React, { useMemo } from 'react';
import { AnalysisStats, VoltageTriplet, Language } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface AnalysisReportProps {
  stats: AnalysisStats;
  data?: VoltageTriplet[];
  lang?: Language;
  timezone: string;
  viewMode?: 'full'; // Only 'full' mode is needed now for the top dashboard
}

// Helper for Timezone
const fmtTime = (ts: number | null, tz: string) => {
    if (!ts) return '--:--';
    return new Date(ts).toLocaleTimeString('uk-UA', { 
        timeZone: tz, 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

const fmtDate = (ts: number | null, tz: string) => {
    if (!ts) return '--.--.--';
    return new Date(ts).toLocaleDateString('uk-UA', {
        timeZone: tz,
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
};

const StatCard = ({ label, value, sub, colorClass, icon }: any) => (
    <div className={`p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-md flex flex-col justify-between h-full min-h-[100px] shadow-lg relative overflow-hidden group hover:border-white/20 transition-all ${colorClass}`}>
        <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity scale-150">{icon}</div>
        <div className="text-[10px] uppercase font-bold text-textMuted tracking-widest mb-1 z-10">{label}</div>
        <div className="text-xl md:text-2xl font-black z-10 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{value}</div>
        {sub && <div className="text-xs opacity-70 mt-1 font-mono z-10 font-bold">{sub}</div>}
    </div>
);

const AnalysisReport: React.FC<AnalysisReportProps> = ({ stats, data, lang = 'uk', timezone }) => {
  
  const t = {
      period: lang === 'uk' ? 'Період' : lang === 'ru' ? 'Период' : 'Period',
      duration: lang === 'uk' ? 'Тривалість' : lang === 'ru' ? 'Длительность' : 'Duration',
      events: lang === 'uk' ? 'Події' : lang === 'ru' ? 'События' : 'Events',
      violations: lang === 'uk' ? 'Порушення' : lang === 'ru' ? 'Нарушений' : 'Violations',
      imbalance: lang === 'uk' ? 'Макс. Перекіс' : lang === 'ru' ? 'Макс. Перекос' : 'Max Imbalance',
      health: lang === 'uk' ? 'Оцінка Ризику' : lang === 'ru' ? 'Оценка Риска' : 'Risk Assessment',
      phaseStats: lang === 'uk' ? 'Статистика по Фазах' : lang === 'ru' ? 'Статистика по Фазам' : 'Phase Statistics',
      avg: lang === 'uk' ? 'Сер.' : lang === 'ru' ? 'Сред.' : 'Avg',
      min: lang === 'uk' ? 'Мін.' : lang === 'ru' ? 'Мин.' : 'Min',
      max: lang === 'uk' ? 'Макс.' : lang === 'ru' ? 'Макс.' : 'Max',
      violLH: lang === 'uk' ? 'Вихід (Низ/Вис)' : lang === 'ru' ? 'Выход (Низ/Выс)' : 'Out (Low/High)',
      metric: lang === 'uk' ? 'Параметр' : lang === 'ru' ? 'Параметр' : 'Metric',
      phL1: lang === 'uk' ? 'Фаза L1' : lang === 'ru' ? 'Фаза L1' : 'Phase L1',
      phL2: lang === 'uk' ? 'Фаза L2' : lang === 'ru' ? 'Фаза L2' : 'Phase L2',
      phL3: lang === 'uk' ? 'Фаза L3' : lang === 'ru' ? 'Фаза L3' : 'Phase L3',
      dist: lang === 'uk' ? 'Гістограма Напруги (V)' : lang === 'ru' ? 'Гистограмма Напряжения (V)' : 'Voltage Histogram (V)',
      hours: lang === 'uk' ? 'год.' : lang === 'ru' ? 'ч.' : 'h',
  };

  // Compute Histogram Data
  const histogramData = useMemo(() => {
      if(!data || data.length === 0) return [];
      const buckets: Record<number, {bin: number, L1: number, L2: number, L3: number}> = {};
      const start = 180;
      const end = 280;
      const step = 2;

      for(let v=start; v<=end; v+=step) {
          buckets[v] = {bin: v, L1: 0, L2: 0, L3: 0};
      }

      data.forEach(d => {
          (['L1', 'L2', 'L3'] as const).forEach(ph => {
              const val = d[ph];
              if(val !== null) {
                  let bin = Math.floor(val / step) * step;
                  if (bin < start) bin = start;
                  if (bin > end) bin = end;
                  if(buckets[bin]) buckets[bin][ph]++;
              }
          });
      });
      return Object.values(buckets).sort((a,b) => a.bin - b.bin);
  }, [data]);

  const startTimeStr = stats.startTime ? `${fmtDate(stats.startTime, timezone)} ${fmtTime(stats.startTime, timezone)}` : '-';
  const endTimeStr = stats.endTime ? `${fmtTime(stats.endTime, timezone)}` : '-';
  const periodStr = `${startTimeStr} - ${endTimeStr}`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full animate-fade-in-up">
        
        {/* LEFT COLUMN: 4 Summary Cards (Takes 4/12 columns on large screens) */}
        <div className="xl:col-span-4 grid grid-cols-2 gap-4 h-full">
            <StatCard 
                label={t.period} 
                value={periodStr} 
                sub={`${t.duration}: ${stats.durationHours.toFixed(1)} ${t.hours}`}
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard 
                label={t.events} 
                value={stats.cntUnder + stats.cntOver} 
                sub={`${t.violations}: ${stats.cntUnder + stats.cntOver}`}
                colorClass={stats.cntUnder + stats.cntOver > 0 ? 'text-warning border-warning/20' : 'text-success border-success/20'}
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            />
            <StatCard 
                label={t.imbalance} 
                value={`${stats.maxDelta.toFixed(1)} V`} 
                sub={`${stats.cntImbalance} events > 15V`}
                colorClass={stats.maxDelta > 15 ? 'text-accent border-accent/20' : 'text-textMain'}
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
            />
            <StatCard 
                label={t.health} 
                value={stats.riskLevel.toUpperCase()} 
                colorClass={stats.riskLevel === 'high' ? 'text-danger bg-danger/5 border-danger/40' : stats.riskLevel === 'medium' ? 'text-warning bg-warning/5 border-warning/40' : 'text-success bg-success/5 border-success/40'}
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
        </div>

        {/* RIGHT COLUMN: Histogram + Stats Table (Takes 8/12 columns) */}
        <div className="xl:col-span-8 flex flex-col gap-4">
            
            {/* 1. HISTOGRAM (TOP) */}
            <div className="glass-panel rounded-xl overflow-hidden border border-white/10 flex-1 min-h-[180px] flex flex-col">
                <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-white text-[10px] uppercase tracking-wider">{t.dist}</h3>
                    <div className="flex gap-2 text-[9px]">
                        <span className="text-red-400">■ L1</span>
                        <span className="text-green-400">■ L2</span>
                        <span className="text-blue-400">■ L3</span>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-0 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={histogramData} margin={{top:5, right:5, bottom:0, left:0}}>
                            <XAxis 
                                dataKey="bin" 
                                tick={{fontSize: 9, fill: '#64748b'}} 
                                tickLine={false} 
                                axisLine={false}
                                interval={2} 
                            />
                            <YAxis tick={{fontSize: 9, fill: '#64748b'}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                cursor={{fill: 'white', opacity: 0.1}}
                                contentStyle={{background: '#0f172a', border: '1px solid #334155', fontSize: '10px'}}
                                labelFormatter={(label) => `${label}V`}
                            />
                            <ReferenceLine x={230} stroke="#ffffff" strokeDasharray="3 3" opacity={0.3} />
                            <Bar dataKey="L1" stackId="a" fill="#f87171" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="L2" stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="L3" stackId="a" fill="#60a5fa" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. PHASE STATS TABLE (BOTTOM) */}
            <div className="glass-panel rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                <div className="overflow-x-auto bg-black/20 custom-scrollbar">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                        <thead className="text-[10px] text-textMuted uppercase bg-white/5 font-mono">
                            <tr>
                                <th className="px-4 py-2">{t.metric}</th>
                                <th className="px-4 py-2 text-red-400">L1</th>
                                <th className="px-4 py-2 text-green-400">L2</th>
                                <th className="px-4 py-2 text-blue-400">L3</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-sm">
                            <tr className="hover:bg-white/5">
                                <td className="px-4 py-2 font-bold opacity-70">{t.min} / {t.max}</td>
                                <td className="px-4 py-2 font-bold text-white">{stats.phases.L1.min.toFixed(0)} / {stats.phases.L1.max.toFixed(0)}</td>
                                <td className="px-4 py-2 font-bold text-white">{stats.phases.L2.min.toFixed(0)} / {stats.phases.L2.max.toFixed(0)}</td>
                                <td className="px-4 py-2 font-bold text-white">{stats.phases.L3.min.toFixed(0)} / {stats.phases.L3.max.toFixed(0)}</td>
                            </tr>
                            <tr className="hover:bg-white/5">
                                <td className="px-4 py-2 font-bold opacity-70">{t.avg}</td>
                                <td className="px-4 py-2 text-white">{stats.phases.L1.avg.toFixed(1)}</td>
                                <td className="px-4 py-2 text-white">{stats.phases.L2.avg.toFixed(1)}</td>
                                <td className="px-4 py-2 text-white">{stats.phases.L3.avg.toFixed(1)}</td>
                            </tr>
                            <tr className="hover:bg-white/5">
                                <td className="px-4 py-2 font-bold opacity-70">{t.violLH}</td>
                                <td className="px-4 py-2">
                                    <span className={stats.phases.L1.underCount > 0 ? 'text-danger' : 'text-textMuted'}>{stats.phases.L1.underCount}</span> / 
                                    <span className={stats.phases.L1.overCount > 0 ? 'text-warning' : 'text-textMuted'}> {stats.phases.L1.overCount}</span>
                                </td>
                                <td className="px-4 py-2">
                                    <span className={stats.phases.L2.underCount > 0 ? 'text-danger' : 'text-textMuted'}>{stats.phases.L2.underCount}</span> / 
                                    <span className={stats.phases.L2.overCount > 0 ? 'text-warning' : 'text-textMuted'}> {stats.phases.L2.overCount}</span>
                                </td>
                                <td className="px-4 py-2">
                                    <span className={stats.phases.L3.underCount > 0 ? 'text-danger' : 'text-textMuted'}>{stats.phases.L3.underCount}</span> / 
                                    <span className={stats.phases.L3.overCount > 0 ? 'text-warning' : 'text-textMuted'}> {stats.phases.L3.overCount}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>
  );
};

export default AnalysisReport;
