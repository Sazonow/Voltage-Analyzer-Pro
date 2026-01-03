
import React, { useState, useMemo } from 'react';
import { VoltageTriplet, Language } from '../types';

interface DataTableProps {
  data: VoltageTriplet[];
  lang: Language;
  timezone: string;
  onRowClick: (ts: number) => void;
}

const DataTable: React.FC<DataTableProps> = ({ data, lang, timezone, onRowClick }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); 
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'issue' | 'ok'>('all'); 
  const [searchFilter, setSearchFilter] = useState('');
  const [visiblePhases, setVisiblePhases] = useState({ L1: true, L2: true, L3: true });
  
  const filteredData = useMemo(() => {
    let res = data;
    
    // 1. Status Filter
    if (statusFilter === 'issue') {
        res = res.filter(r => r.status !== 'ok');
    } else if (statusFilter === 'ok') {
        res = res.filter(r => r.status === 'ok');
    }

    // 2. Text Search
    if (searchFilter) {
      const lower = searchFilter.toLowerCase();
      res = res.filter(r => 
        (r.deviationDetails && r.deviationDetails.join(' ').toLowerCase().includes(lower)) ||
        r.status.includes(lower)
      );
    }
    
    return res.sort((a, b) => b.ts - a.ts);
  }, [data, statusFilter, searchFilter]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  const t = {
      title: lang === 'uk' ? 'Журнал подій' : lang === 'ru' ? 'Журнал событий' : 'Event Log',
      searchPlaceholder: lang === 'uk' ? 'Пошук...' : lang === 'ru' ? 'Поиск...' : 'Search...',
      filters: lang === 'uk' ? 'Фільтри' : lang === 'ru' ? 'Фильтры' : 'Filters',
      cols: lang === 'uk' ? 'Стовпці' : lang === 'ru' ? 'Столбцы' : 'Columns',
      status: lang === 'uk' ? 'Статус' : lang === 'ru' ? 'Статус' : 'Status',
      issuesOnly: lang === 'uk' ? 'Тільки Проблеми' : lang === 'ru' ? 'Только Проблемы' : 'Issues Only',
      all: lang === 'uk' ? 'Всі' : lang === 'ru' ? 'Все' : 'All',
      okOnly: lang === 'uk' ? 'Тільки Норма' : lang === 'ru' ? 'Только Норма' : 'Normal Only',
      time: lang === 'uk' ? 'Час' : lang === 'ru' ? 'Время' : 'Time',
      page: lang === 'uk' ? 'Сторінка' : 'Page',
      of: lang === 'uk' ? 'з' : 'of',
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'ok': return <span className="text-success text-[10px] font-bold border border-success/30 px-2 py-0.5 rounded bg-success/10">OK</span>;
        case 'over': return <span className="text-warning text-[10px] font-bold border border-warning/30 px-2 py-0.5 rounded bg-warning/10">HIGH</span>;
        case 'under': return <span className="text-danger text-[10px] font-bold border border-danger/30 px-2 py-0.5 rounded bg-danger/10">LOW</span>;
        case 'imbalance': return <span className="text-accent text-[10px] font-bold border border-accent/30 px-2 py-0.5 rounded bg-accent/10">UNBAL</span>;
        default: return null;
    }
  };

  // Dynamic Timezone formatter
  const formatTime = (ts: number) => {
      return new Date(ts).toLocaleString('uk-UA', {timeZone: timezone});
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[500px] border border-white/10 relative overflow-hidden">
      
      {/* Header Bar */}
      <div className="p-3 border-b border-white/10 flex flex-col gap-3 bg-white/[0.02]">
        <div className="flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                {t.title}
            </h3>
            <div className="flex gap-2">
                 <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${showFilters ? 'bg-accent border-accent text-white' : 'border-white/10 text-textMuted hover:bg-white/5'}`}
                 >
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                     {t.filters}
                 </button>
            </div>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
            <div className="bg-black/40 rounded-lg p-3 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-fade-in-up">
                {/* 1. Status */}
                <div className="space-y-1">
                    <label className="text-textMuted font-bold uppercase text-[10px]">{t.status}</label>
                    <div className="flex gap-1">
                        <button onClick={() => setStatusFilter('all')} className={`px-2 py-1 rounded border ${statusFilter === 'all' ? 'bg-white/20 border-white text-white' : 'border-white/10 text-textMuted'}`}>{t.all}</button>
                        <button onClick={() => setStatusFilter('issue')} className={`px-2 py-1 rounded border ${statusFilter === 'issue' ? 'bg-danger/20 border-danger text-danger' : 'border-white/10 text-textMuted'}`}>{t.issuesOnly}</button>
                        <button onClick={() => setStatusFilter('ok')} className={`px-2 py-1 rounded border ${statusFilter === 'ok' ? 'bg-success/20 border-success text-success' : 'border-white/10 text-textMuted'}`}>{t.okOnly}</button>
                    </div>
                </div>

                {/* 2. Columns */}
                <div className="space-y-1">
                    <label className="text-textMuted font-bold uppercase text-[10px]">{t.cols}</label>
                    <div className="flex gap-2">
                         <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={visiblePhases.L1} onChange={e => setVisiblePhases({...visiblePhases, L1: e.target.checked})} className="accent-red-500" /> <span className="text-red-300">L1</span></label>
                         <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={visiblePhases.L2} onChange={e => setVisiblePhases({...visiblePhases, L2: e.target.checked})} className="accent-green-500" /> <span className="text-green-300">L2</span></label>
                         <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={visiblePhases.L3} onChange={e => setVisiblePhases({...visiblePhases, L3: e.target.checked})} className="accent-blue-500" /> <span className="text-blue-300">L3</span></label>
                    </div>
                </div>

                {/* 3. Search */}
                <div className="space-y-1">
                    <label className="text-textMuted font-bold uppercase text-[10px]">Search</label>
                    <input 
                        type="text" 
                        value={searchFilter} 
                        onChange={e => setSearchFilter(e.target.value)}
                        placeholder={t.searchPlaceholder}
                        className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 focus:border-accent outline-none text-white"
                    />
                </div>
            </div>
        )}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar bg-black/20">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0f172a] sticky top-0 z-10 font-mono uppercase text-textMuted text-[10px] tracking-wider shadow-lg">
            <tr>
              <th className="p-3 border-b border-white/10">{t.time}</th>
              {visiblePhases.L1 && <th className="p-3 border-b border-white/10 text-red-400">L1 (V)</th>}
              {visiblePhases.L2 && <th className="p-3 border-b border-white/10 text-green-400">L2 (V)</th>}
              {visiblePhases.L3 && <th className="p-3 border-b border-white/10 text-blue-400">L3 (V)</th>}
              <th className="p-3 border-b border-white/10">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {paginatedData.map((row) => (
              <tr 
                key={row.id} 
                onClick={() => onRowClick(row.ts)}
                className={`
                    hover:bg-white/10 transition-colors cursor-pointer group 
                    ${row.status === 'under' ? 'bg-red-500/5 hover:bg-red-500/10' : ''}
                    ${row.status === 'over' ? 'bg-orange-500/5 hover:bg-orange-500/10' : ''}
                    ${row.status === 'imbalance' ? 'bg-blue-500/5 hover:bg-blue-500/10' : ''}
                `}
              >
                <td className="p-3 text-white/70 whitespace-nowrap">{formatTime(row.ts)}</td>
                {visiblePhases.L1 && <td className="p-3 text-white font-bold">{row.L1?.toFixed(1) ?? '-'}</td>}
                {visiblePhases.L2 && <td className="p-3 text-white font-bold">{row.L2?.toFixed(1) ?? '-'}</td>}
                {visiblePhases.L3 && <td className="p-3 text-white font-bold">{row.L3?.toFixed(1) ?? '-'}</td>}
                <td className="p-3 flex items-center gap-2">
    {getStatusBadge(row.status)}
    {row.session === 'session' && (
      <span className="text-[10px] font-bold border border-violet-500/30 bg-violet-500/10 text-violet-200 px-2 py-0.5 rounded">
        TX:{row.sessionId ?? ''} · C:{row.connectorId}
        {(row as any).controllerVersion ? ` · CTRL:${String((row as any).controllerVersion)}` : ''}
        {(row as any).connectorType ? ` · ${(row as any).connectorType}` : ''}
        {(row as any).firmwareVersion ? ` · FW:${String((row as any).firmwareVersion).slice(0, 24)}` : ''}
      </span>
    )}
    {row.delta > 15 && <span className="text-[9px] text-accent opacity-70">Δ{row.delta.toFixed(0)}</span>}
</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer Pagination */}
      <div className="p-2 border-t border-white/10 flex justify-between items-center bg-white/[0.02] text-[10px]">
          <span className="text-textMuted">{t.page} <span className="text-white font-bold">{page}</span> {t.of} {totalPages}</span>
          <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/5">Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/5">Next</button>
          </div>
      </div>
    </div>
  );
};

export default DataTable;
