
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { VoltageTriplet, Language } from '../types';

interface VoltageChartProps {
  data: VoltageTriplet[];
  vmin: number;
  vmax: number;
  lang: Language;
  timezone: string;
  selectedTimestamp?: number | null;
  parsingErrorCount?: number;
  badTimestampCount?: number;
  badTimestampSamples?: string[];
  onZoomChange?: (range: { start: number; end: number } | null) => void;
  printMode?: boolean;
}

// ---------- Small utils ----------
const fmtTime = (ts: number, timezone: string) => {
  const d = new Date(ts);
  const parts = new Intl.DateTimeFormat('uk-UA', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const h = parts.find(p => p.type === 'hour')?.value ?? '00';
  const m = parts.find(p => p.type === 'minute')?.value ?? '00';
  const s = parts.find(p => p.type === 'second')?.value ?? '00';
  return `${h}:${m}:${s}`;
};

const fmtDate = (ts: number, timezone: string) =>
  new Date(ts).toLocaleDateString('uk-UA', { timeZone: timezone });

const clampDomain = (domain: [number, number], minTs: number, maxTs: number): [number, number] => {
  const width = domain[1] - domain[0];
  let a = domain[0];
  let b = domain[1];

  if (a < minTs) {
    a = minTs;
    b = minTs + width;
  }
  if (b > maxTs) {
    b = maxTs;
    a = maxTs - width;
  }
  if (a < minTs) a = minTs;
  if (b > maxTs) b = maxTs;

  return [a, b];
};

const niceStep = (spanMs: number): number => {
  const candidates = [
    1, 2, 5, 10, 15, 30,
    60, 2 * 60, 5 * 60, 10 * 60, 15 * 60, 30 * 60,
    60 * 60, 2 * 60 * 60, 6 * 60 * 60, 12 * 60 * 60,
    24 * 60 * 60,
  ].map(x => x * 1000);

  const target = spanMs / 8;
  let best = candidates[0];
  let bestDist = Math.abs(best - target);
  for (const c of candidates) {
    const d = Math.abs(c - target);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
};

const yStep = (range: number): number => {
  const raw = range / 6;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
};

const COLORS: Record<'L1' | 'L2' | 'L3', string> = {
  L1: '#ef4444',
  L2: '#22c55e',
  L3: '#3b82f6',
};

const NOMINAL = 230;

// downsample by simple stride (safe for canvas)
const downsample = (data: VoltageTriplet[], target = 3000) => {
  if (data.length <= target) return data;
  const step = Math.ceil(data.length / target);
  const out: VoltageTriplet[] = [];
  for (let i = 0; i < data.length; i += step) out.push(data[i]);
  if (out[out.length - 1] !== data[data.length - 1]) out.push(data[data.length - 1]);
  return out;
};

export default function VoltageChart(props: VoltageChartProps) {
  const { 
    data, vmin, vmax, lang, timezone, 
    badTimestampCount = 0, badTimestampSamples = [], 
    onZoomChange, printMode = false 
  } = props;

  // ---------- UI state ----------
  const [autoY, setAutoY] = useState(true);
  const [zoomEnabled, setZoomEnabled] = useState(true); // wheel zoom + drag pan (single-file principle)
  const [pinned, setPinned] = useState(false); // freeze tooltip position on click
  const [showL1, setShowL1] = useState(true);
  const [showL2, setShowL2] = useState(true);
  const [showL3, setShowL3] = useState(true);
  const [showSessions, setShowSessions] = useState(false);
  const [showBadTs, setShowBadTs] = useState(false);

  // ---------- Canvas refs/state ----------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [domainX, setDomainX] = useState<[number, number] | null>(null); // ms
  const dragRef = useRef<{ startX: number; startDomain: [number, number] } | null>(null);
  const [dragging, setDragging] = useState(false);

  const [selecting, setSelecting] = useState(false);
  const selectRef = useRef<{ startX: number; startDomain: [number, number] } | null>(null);
  const [selection, setSelection] = useState<{ x0: number; x1: number; start: number; end: number } | null>(null);
  const [rangeMenu, setRangeMenu] = useState<{ x: number; y: number; start: number; end: number } | null>(null);

  const [hover, setHover] = useState<{
    x: number;
    y: number;
    idx: number;
    phase: 'L1' | 'L2' | 'L3' | null;
    locked: boolean;
  } | null>(null);
  const lockPhaseRef = useRef<'L1' | 'L2' | 'L3' | null>(null);

  // ---------- Derived ----------
  const sorted = useMemo(() => {
    const arr = [...data].sort((a, b) => a.ts - b.ts);
    return arr;
  }, [data]);

  const bounds = useMemo(() => {
    if (!sorted.length) return null;
    return { minTs: sorted[0].ts, maxTs: sorted[sorted.length - 1].ts };
  }, [sorted]);

  // ---------- Zoom state ----------
  useEffect(() => {
    if (!bounds) return;
    // Initialize once and keep the current view even when navigation is toggled off.
    setDomainX(d => {
      const base: [number, number] = d ?? [bounds.minTs, bounds.maxTs];
      return clampDomain(base, bounds.minTs, bounds.maxTs);
    });
  }, [bounds]);

  useEffect(() => {
    if (printMode) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setPinned(false);
        lockPhaseRef.current = null;
        setSelection(null);
        setRangeMenu(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [printMode]);

  const visible = useMemo(() => {
    if (!sorted.length) return sorted;
    if (!domainX) return sorted;
    const [a, b] = domainX;
    return sorted.filter(p => p.ts >= a && p.ts <= b);
  }, [sorted, domainX]);

  const chartData = useMemo(() => downsample(visible, 3500), [visible]);

  const yRange = useMemo(() => {
    if (!chartData.length) return { minV: vmin, maxV: vmax };
    if (!autoY) return { minV: vmin, maxV: vmax };
    let mn = Number.POSITIVE_INFINITY;
    let mx = Number.NEGATIVE_INFINITY;
    for (const p of chartData) {
      const vals = [p.L1, p.L2, p.L3].filter(v => typeof v === 'number') as number[];
      for (const v of vals) {
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    }
    if (!isFinite(mn) || !isFinite(mx)) return { minV: vmin, maxV: vmax };
    const pad = Math.max(2, (mx - mn) * 0.08);
    return { minV: Math.floor(mn - pad), maxV: Math.ceil(mx + pad) };
  }, [chartData, autoY, vmin, vmax]);

  const t = useMemo(() => {
    return {
      title: lang === 'ru' ? 'График напряжения' : lang === 'uk' ? 'Графік напруги' : 'Voltage Timeline',
      points: lang === 'ru' ? 'точек' : lang === 'uk' ? 'точок' : 'points',
      autoY: lang === 'ru' ? 'Auto Y' : lang === 'uk' ? 'Auto Y' : 'Auto Y',
      zoompan: lang === 'ru' ? 'Зум/Пан' : lang === 'uk' ? 'Зум/Пан' : 'Zoom/Pan',
      reset: lang === 'ru' ? 'Сброс' : lang === 'uk' ? 'Скинути' : 'Reset',
      png: 'PNG',
      csv: 'CSV',
      sessions: lang === 'ru' ? 'Сессии' : lang === 'uk' ? 'Сесії' : 'Sessions',
      badTs: lang === 'ru' ? 'Битые даты' : lang === 'uk' ? 'Биті дати' : 'Bad timestamps',
    };
  }, [lang]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const W = Math.max(1, Math.floor(rect.width));
    const H = Math.max(1, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Style Configuration
    const styles = printMode ? {
        text: '#475569',
        grid: 'rgba(0,0,0,0.1)',
        axis: 'rgba(0,0,0,0.3)',
        label: '#1e293b',
        nominal: 'rgba(0,0,0,0.3)',
    } : {
        text: '#9fb1d2',
        grid: 'rgba(255,255,255,.14)',
        axis: 'rgba(255,255,255,.22)',
        label: '#cfe0ff',
        nominal: 'rgba(255,255,255,.18)',
    };

    if (!chartData.length) {
      ctx.fillStyle = styles.text;
      ctx.font = '14px system-ui';
      ctx.fillText(lang === 'ru' ? 'Нет данных' : lang === 'uk' ? 'Немає даних' : 'No data', 12, 20);
      return;
    }

    const padL = 60;
    const padR = 12;
    const padT = 18;
    const padB = 40;

    const minT = domainX ? domainX[0] : chartData[0].ts;
    const maxT = domainX ? domainX[1] : chartData[chartData.length - 1].ts;
    const minV = yRange.minV;
    const maxV = yRange.maxV;

    const X = (ts: number) => padL + ((ts - minT) / (maxT - minT || 1)) * (W - padL - padR);
    const Y = (v: number) => (H - padB) - ((v - minV) / (maxV - minV || 1)) * (H - padB - padT);

    // axes
    ctx.strokeStyle = styles.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();

    // vertical grid
    const step = niceStep(maxT - minT);
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = styles.grid;
    ctx.fillStyle = styles.text;
    ctx.font = '12px system-ui';

    const t0 = Math.ceil(minT / step) * step;
    for (let tt = t0; tt < maxT; tt += step) {
      const x = X(tt);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, H - padB);
      ctx.stroke();

      const label = fmtTime(tt, timezone);
      ctx.save();
      ctx.translate(x, H - padB + 14);
      ctx.rotate(-0.55);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    // horizontal grid
    const ys = yStep(maxV - minV);
    for (let vv = Math.ceil(minV / ys) * ys; vv < maxV; vv += ys) {
      const y = Y(vv);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = styles.text;
      ctx.fillText(`${Math.round(vv)}V`, 8, y + 4);
      ctx.setLineDash([4, 6]);
    }
    ctx.setLineDash([]);

    // labels
    ctx.save();
    ctx.fillStyle = styles.label;
    ctx.font = '12px system-ui';
    ctx.translate(14, H / 2 + 18);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(lang === 'ru' ? 'Напряжение, В' : lang === 'uk' ? 'Напруга, В' : 'Voltage, V', 0, 0);
    ctx.restore();
    ctx.fillText(lang === 'ru' ? 'Время' : lang === 'uk' ? 'Час' : 'Time', W / 2 - 20, H - 6);

    // nominal 230
    const yNom = Y(NOMINAL);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = styles.nominal;
    ctx.beginPath();
    ctx.moveTo(padL, yNom);
    ctx.lineTo(W - padR, yNom);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawPhase = (ph: 'L1' | 'L2' | 'L3', enabled: boolean, key: 'L1' | 'L2' | 'L3') => {
      if (!enabled) return;
      ctx.strokeStyle = COLORS[ph];
      ctx.lineWidth = 2;
      ctx.globalAlpha = printMode ? 1.0 : 0.92;
      ctx.beginPath();
      let started = false;
      for (const p of chartData) {
        if (p.ts < minT || p.ts > maxT) continue;
        const v = p[key];
        if (typeof v !== 'number') continue;
        const x = X(p.ts);
        const y = Y(v);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (showSessions && !printMode) {
        ctx.fillStyle = 'rgba(167,139,250,0.95)';
        for (const p of chartData) {
          if (p.ts < minT || p.ts > maxT) continue;
          if (p.session !== 'session') continue;
          const v = p[key];
          if (typeof v !== 'number') continue;
          const x = X(p.ts);
          const y = Y(v);
          ctx.beginPath();
          ctx.arc(x, y, 3.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    drawPhase('L1', showL1, 'L1');
    drawPhase('L2', showL2, 'L2');
    drawPhase('L3', showL3, 'L3');

    // selected timestamp marker
    if (props.selectedTimestamp && props.selectedTimestamp > 0 && !printMode) {
      const ts = props.selectedTimestamp;
      if (ts >= minT && ts <= maxT) {
        ctx.strokeStyle = 'rgba(255,255,255,.25)';
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(X(ts), padT);
        ctx.lineTo(X(ts), H - padB);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // legend top-right
    const legend = [
      { ph: 'L1' as const, ok: showL1 },
      { ph: 'L2' as const, ok: showL2 },
      { ph: 'L3' as const, ok: showL3 },
    ];
    let off = 0;
    const lx = W - 92;
    const ly = 26;
    for (const it of legend) {
      if (!it.ok) continue;
      ctx.strokeStyle = COLORS[it.ph];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly + off);
      ctx.lineTo(lx + 22, ly + off);
      ctx.stroke();
      ctx.fillStyle = COLORS[it.ph];
      ctx.beginPath();
      ctx.arc(lx + 11, ly + off, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = styles.label;
      ctx.font = '12px system-ui';
      ctx.fillText(it.ph, lx + 28, ly + off + 4);
      off += 18;
    }
  }, [chartData, yRange, domainX, showL1, showL2, showL3, showSessions, lang, timezone, props.selectedTimestamp, printMode]);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, hover]); // Redraw on hover change to update tooltip if logic requires, but tooltip is HTML overlay. Draw uses hover? No.

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);

  // wheel zoom (passive:false) — EXACT like single-file
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    if (!zoomEnabled || printMode) return;

    const onWheel = (e: WheelEvent) => {
      if (!bounds) return;
      e.preventDefault();

      const rect = wrap.getBoundingClientRect();
      if (!rect.width || rect.width < 10) return;

      const dom: [number, number] = domainX ?? [bounds.minTs, bounds.maxTs];
      const span = dom[1] - dom[0];
      const factor = e.deltaY < 0 ? 0.9 : 1.1;
      const newSpan = Math.max(1000, span * factor);

      const rel = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      const center = dom[0] + span * rel;

      const next: [number, number] = [center - newSpan * rel, center + newSpan * (1 - rel)];
      const clamped = clampDomain(next, bounds.minTs, bounds.maxTs);
      setDomainX(clamped);
      onZoomChange?.({ start: clamped[0], end: clamped[1] });
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel as any);
  }, [zoomEnabled, bounds, domainX, onZoomChange, printMode]);

  const viewDomain = useCallback((): [number, number] | null => {
    if (!bounds) return null;
    return domainX ?? [bounds.minTs, bounds.maxTs];
  }, [bounds, domainX]);

  const xToTs = useCallback((clientX: number): number | null => {
    const wrap = wrapRef.current;
    const dom = viewDomain();
    if (!wrap || !dom) return null;
    const rect = wrap.getBoundingClientRect();
    const W = rect.width || 1;

    const padL = 60;
    const padR = 12;

    const x = clientX - rect.left;
    const innerW = Math.max(1, W - padL - padR);
    const rel = Math.min(Math.max((x - padL) / innerW, 0), 1);
    return dom[0] + rel * (dom[1] - dom[0]);
  }, [viewDomain]);

  // Mouse down: Alt+Drag = range select (always available). Plain drag = pan (only when zoomEnabled).
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!bounds || printMode) return;
    if (e.button !== 0) return;

    // Close range menu when starting any new interaction.
    setRangeMenu(null);

    // Alt+Drag => selection rectangle
    if (e.altKey) {
      const dom = domainX ?? [bounds.minTs, bounds.maxTs];
      selectRef.current = { startX: e.clientX, startDomain: dom };
      setSelecting(true);
      setSelection(null);
      e.preventDefault();
      return;
    }

    // Plain drag => pan
    if (!zoomEnabled) return;

    const dom: [number, number] = domainX ?? [bounds.minTs, bounds.maxTs];
    dragRef.current = { startX: e.clientX, startDomain: dom };
    setDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!dragging || !zoomEnabled || !bounds || printMode) return;

    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const onMove = (e: MouseEvent) => {
      const cur = dragRef.current;
      const wrap = wrapRef.current;
      if (!cur || !wrap) return;
      const rect = wrap.getBoundingClientRect();
      const W = rect.width || 1;
      const span = cur.startDomain[1] - cur.startDomain[0];
      const dx = e.clientX - cur.startX;
      const shift = (-dx / W) * span;
      const next: [number, number] = [cur.startDomain[0] + shift, cur.startDomain[1] + shift];
      const clamped = clampDomain(next, bounds.minTs, bounds.maxTs);
      setDomainX(clamped);
      onZoomChange?.({ start: clamped[0], end: clamped[1] });
    };

    const onUp = () => {
      setDragging(false);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onUp);
    return () => {
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, [dragging, zoomEnabled, bounds, onZoomChange, printMode]);

  // Alt+Drag selection (range)
  useEffect(() => {
    if (!selecting || !bounds || printMode) return;

    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const onMove = (e: MouseEvent) => {
      const cur = selectRef.current;
      const wrap = wrapRef.current;
      if (!cur || !wrap) return;

      const rect = wrap.getBoundingClientRect();
      const x0 = cur.startX - rect.left;
      const x1 = e.clientX - rect.left;

      const ts0 = xToTs(cur.startX) ?? bounds.minTs;
      const ts1 = xToTs(e.clientX) ?? bounds.maxTs;

      const start = Math.min(ts0, ts1);
      const end = Math.max(ts0, ts1);

      setSelection({ x0, x1, start, end });
    };

    const onUp = (e: MouseEvent) => {
      setSelecting(false);
      selectRef.current = null;

      // Finalize menu if selection is meaningful
      setSelection(prev => {
        if (!prev) return null;
        if (Math.abs(prev.x1 - prev.x0) < 8 || (prev.end - prev.start) < 1500) {
          // too small => ignore
          return null;
        }
        const wrap = wrapRef.current;
        if (wrap) {
          const rect = wrap.getBoundingClientRect();
          const midX = (prev.x0 + prev.x1) / 2;
          const menuX = Math.min(Math.max(midX, 12), rect.width - 260);
          const menuY = Math.min(Math.max(16, 12), rect.height - 120);
          setRangeMenu({ x: menuX, y: menuY, start: prev.start, end: prev.end });
        }
        return prev;
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onUp);
    return () => {
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, [selecting, bounds, printMode, xToTs]);

  const resetZoom = () => {
    if (!bounds) return;
    lockPhaseRef.current = null;
    setPinned(false);
    const d: [number, number] = [bounds.minTs, bounds.maxTs];
    setDomainX(d);
    onZoomChange?.(null);
  };

  // hover for tooltip
  const phaseAt = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    if (!wrap || !chartData.length || !bounds) return { idx: -1 as const, phase: null as 'L1' | 'L2' | 'L3' | null };
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const padL = 60;
    const padR = 12;
    const padT = 18;
    const padB = 40;

    const minT = domainX ? domainX[0] : chartData[0].ts;
    const maxT = domainX ? domainX[1] : chartData[chartData.length - 1].ts;
    const minV = yRange.minV;
    const maxV = yRange.maxV;

    const W = rect.width;
    const H = rect.height;

    const X = (ts: number) => padL + ((ts - minT) / (maxT - minT || 1)) * (W - padL - padR);
    const Y = (v: number) => (H - padB) - ((v - minV) / (maxV - minV || 1)) * (H - padB - padT);

    let bestIdx = -1;
    let bestPhase: 'L1' | 'L2' | 'L3' | null = null;
    let bestDist = 18;

    const enabled = { L1: showL1, L2: showL2, L3: showL3 };

    for (let i = 0; i < chartData.length; i++) {
      const p = chartData[i];
      if (p.ts < minT || p.ts > maxT) continue;

      for (const ph of ['L1', 'L2', 'L3'] as const) {
        if (!enabled[ph]) continue;
        const v = (p as any)[ph] as number | null;
        if (typeof v !== 'number') continue;
        const dx = X(p.ts) - x;
        const dy = Y(v) - y;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
          bestPhase = ph;
        }
      }
    }
    return { idx: bestIdx, phase: bestPhase };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!chartData.length) return;
    if (dragging || printMode) return;
    if (pinned) return;

    const locked = lockPhaseRef.current !== null;
    const { idx, phase } = phaseAt(e.clientX, e.clientY);
    if (idx < 0) {
      if (!locked) setHover(null);
      return;
    }
    const wrap = wrapRef.current!;
    const r = wrap.getBoundingClientRect();
    setHover({ x: e.clientX - r.left, y: e.clientY - r.top, idx, phase, locked });
  };

  const handleMouseLeave = () => {
    if (pinned) return;
    if (!lockPhaseRef.current) setHover(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (printMode) return;
    if (rangeMenu) setRangeMenu(null);
    const { idx, phase } = phaseAt(e.clientX, e.clientY);
    if (idx < 0 || !phase) return;

    const wrap = wrapRef.current!;
    const r = wrap.getBoundingClientRect();

    // Shift+Click: lock a phase (L1/L2/L3). Normal click: pin/unpin tooltip.
    if (e.shiftKey) {
      lockPhaseRef.current = lockPhaseRef.current === phase ? null : phase;
      setHover({ x: e.clientX - r.left, y: e.clientY - r.top, idx, phase, locked: lockPhaseRef.current !== null });
      return;
    }

    setPinned(p => !p);
    setHover({ x: e.clientX - r.left, y: e.clientY - r.top, idx, phase, locked: lockPhaseRef.current !== null });
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voltage_chart.png';
    a.click();
  };

  const exportCSV = () => {
    const rows: string[][] = [];
    rows.push(['timestamp', 'dataset', 'connector', 'L1', 'L2', 'L3', 'delta', 'status', 'session', 'sessionId']);
    for (const p of visible) {
      rows.push([
        new Date(p.ts).toISOString(),
        p.dataset ?? '',
        String(p.connectorId ?? ''),
        p.L1 == null ? '' : String(p.L1),
        p.L2 == null ? '' : String(p.L2),
        p.L3 == null ? '' : String(p.L3),
        String(p.delta ?? ''),
        p.status ?? '',
        p.session ?? '',
        p.sessionId ?? '',
      ]);
    }
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'voltage_data.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const zoomToRange = (start: number, end: number) => {
    if (!bounds) return;
    const clamped = clampDomain([start, end], bounds.minTs, bounds.maxTs);
    setDomainX(clamped);
    onZoomChange?.({ start: clamped[0], end: clamped[1] });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const copyRange = async (start: number, end: number) => {
    const a = new Date(start).toISOString();
    const b = new Date(end).toISOString();
    await copyToClipboard(`${a} .. ${b}`);
  };

  const rangeStats = (start: number, end: number) => {
    const rows = sorted.filter(p => p.ts >= start && p.ts <= end);
    const acc = { L1: [] as number[], L2: [] as number[], L3: [] as number[] };
    let sessions = 0;
    let issues = 0;
    for (const r of rows) {
      if (typeof r.L1 === 'number') acc.L1.push(r.L1);
      if (typeof r.L2 === 'number') acc.L2.push(r.L2);
      if (typeof r.L3 === 'number') acc.L3.push(r.L3);
      if (r.session === 'session') sessions++;
      if (r.status !== 'ok') issues++;
    }
    const stat = (arr: number[]) => {
      if (!arr.length) return null;
      const mn = Math.min(...arr);
      const mx = Math.max(...arr);
      const avg = arr.reduce((s, x) => s + x, 0) / arr.length;
      return { min: mn, max: mx, avg };
    };
    return {
      points: rows.length,
      sessions,
      issues,
      L1: stat(acc.L1),
      L2: stat(acc.L2),
      L3: stat(acc.L3),
    };
  };

  const copyRangePrompt = async (start: number, end: number) => {
    const st = rangeStats(start, end);
    const a = new Date(start).toISOString();
    const b = new Date(end).toISOString();
    const msg = [
      `Analyze voltage timeline in range: ${a} .. ${b}`,
      `Points: ${st.points}, sessions: ${st.sessions}, issues: ${st.issues}`,
      st.L1 ? `L1 min/avg/max: ${st.L1.min.toFixed(1)}/${st.L1.avg.toFixed(1)}/${st.L1.max.toFixed(1)} V` : `L1: n/a`,
      st.L2 ? `L2 min/avg/max: ${st.L2.min.toFixed(1)}/${st.L2.avg.toFixed(1)}/${st.L2.max.toFixed(1)} V` : `L2: n/a`,
      st.L3 ? `L3 min/avg/max: ${st.L3.min.toFixed(1)}/${st.L3.avg.toFixed(1)}/${st.L3.max.toFixed(1)} V` : `L3: n/a`,
      `Thresholds: vmin=${vmin}, vmax=${vmax}.`,
      `Ask for: suspected cause, correlation with sessions/status, and recommended action.`,
    ].join('\n');
    await copyToClipboard(msg);
  };

  const exportSelectionPNG = (start: number, end: number) => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !bounds) return;

    const rect = wrap.getBoundingClientRect();
    const W = rect.width || 1;

    const padL = 60;
    const padR = 12;

    const dom = domainX ?? [bounds.minTs, bounds.maxTs];
    const innerW = Math.max(1, W - padL - padR);

    const tsToX = (ts: number) => padL + ((ts - dom[0]) / (dom[1] - dom[0] || 1)) * innerW;

    const x0 = tsToX(start);
    const x1 = tsToX(end);
    const left = Math.floor(Math.min(x0, x1));
    const right = Math.floor(Math.max(x0, x1));

    if (right - left < 8) return;

    const scale = canvas.width / (wrap.clientWidth || 1);
    const sx = Math.max(0, Math.floor(left * scale));
    const sw = Math.min(canvas.width - sx, Math.floor((right - left) * scale));
    const sy = 0;
    const sh = canvas.height;

    const out = document.createElement('canvas');
    out.width = sw;
    out.height = sh;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    const url = out.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voltage_selection.png';
    a.click();
  };

  const tooltip = useMemo(() => {
    if (!hover) return null;
    const p = chartData[hover.idx];
    if (!p) return null;

    const session = p.session === 'session';
    const conn = p.connectorId;
    const tx = p.sessionId;
    const sessStatus = (p as any).sessionStatus as string | undefined;
    const sessErr = (p as any).sessionErrorCode as string | undefined;
    const fw = (p as any).firmwareVersion as string | undefined;
    const connectorType = (p as any).connectorType as string | undefined;
    const controllerVersion = (p as any).controllerVersion as string | undefined;
    const controllerName = (p as any).controllerName as string | undefined;
    const model = (p as any).chargePointModel as string | undefined;

    const lines: Array<{ label: string; value: string; color: string }> = [];
    if (showL1 && typeof p.L1 === 'number') lines.push({ label: 'L1', value: `${p.L1.toFixed(1)} V`, color: COLORS.L1 });
    if (showL2 && typeof p.L2 === 'number') lines.push({ label: 'L2', value: `${p.L2.toFixed(1)} V`, color: COLORS.L2 });
    if (showL3 && typeof p.L3 === 'number') lines.push({ label: 'L3', value: `${p.L3.toFixed(1)} V`, color: COLORS.L3 });

    return {
      time: fmtTime(p.ts, timezone),
      date: fmtDate(p.ts, timezone),
      session,
      conn,
      tx,
      sessStatus,
      sessErr,
      fw,
      connectorType,
      controllerVersion,
      controllerName,
      model,
      delta: p.delta,
      dataset: p.dataset,
      lines,
    };
  }, [hover, chartData, showL1, showL2, showL3, timezone]);

  return (
    <div className={`w-full rounded-2xl overflow-hidden ${printMode ? 'bg-white' : 'border border-white/10 bg-black/20 backdrop-blur-xl'}`}>
      {!printMode && (
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-white/10">
            <div className="flex items-center gap-3">
            <div className="text-lg font-extrabold tracking-tight text-white">{t.title}</div>
            <div className="text-xs text-textMuted">{visible.length} {t.points}</div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
                type="button"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${autoY ? 'bg-white/5 border-white/10 text-white' : 'bg-transparent border-white/10 text-textMuted hover:text-white'}`}
                onClick={() => setAutoY(v => !v)}
            >
                {t.autoY}
            </button>

            <button
                type="button"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${zoomEnabled ? 'bg-white/5 border-white/10 text-white' : 'bg-transparent border-white/10 text-textMuted hover:text-white'}`}
                onClick={() => setZoomEnabled(v => !v)}
                title={zoomEnabled ? 'Wheel: zoom · Drag: pan (Alt+Drag: select)' : 'Enable wheel/drag navigation'}
            >
                {t.zoompan}
            </button>

            <button
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 bg-transparent text-textMuted hover:text-white"
                onClick={resetZoom}
                title="Reset zoom + unlock phase"
            >
                {t.reset}
            </button>

            <button
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 bg-transparent text-textMuted hover:text-white"
                onClick={() => setShowSessions(v => !v)}
            >
                {t.sessions}
            </button>

            <button type="button" className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 bg-transparent text-textMuted hover:text-white" onClick={exportPNG}>
                {t.png}
            </button>
            <button type="button" className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 bg-transparent text-textMuted hover:text-white" onClick={exportCSV}>
                {t.csv}
            </button>

            {badTimestampCount > 0 && (
                <button
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                onClick={() => setShowBadTs(v => !v)}
                >
                {t.badTs}: {badTimestampCount}
                </button>
            )}
            </div>
        </div>
      )}

      <div className={printMode ? 'p-0' : 'px-4 pt-3 pb-4'}>
        {!printMode && (
            <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowL1(v => !v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${showL1 ? 'border-red-400/40 bg-red-500/10 text-red-200' : 'border-white/10 bg-black/10 text-textMuted'}`}>L1</button>
                <button type="button" onClick={() => setShowL2(v => !v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${showL2 ? 'border-green-400/40 bg-green-500/10 text-green-200' : 'border-white/10 bg-black/10 text-textMuted'}`}>L2</button>
                <button type="button" onClick={() => setShowL3(v => !v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${showL3 ? 'border-blue-400/40 bg-blue-500/10 text-blue-200' : 'border-white/10 bg-black/10 text-textMuted'}`}>L3</button>
            </div>

            <div className="text-[11px] text-textMuted">
                {zoomEnabled
                ? (lang === 'ru' ? 'Колесо: зум · Тяни: пан · Alt+Drag: выделение · Click: закрепить · Esc: сброс' : lang === 'uk' ? 'Колесо: зум · Тягни: пан · Alt+Drag: виділення · Click: закріпити · Esc: скидання' : 'Wheel: zoom · Drag: pan · Alt+Drag: select · Click: pin tooltip · Esc: clear')
                : (lang === 'ru' ? 'Навигация выключена' : lang === 'uk' ? 'Навігацію вимкнено' : 'Navigation disabled')}
            </div>
            </div>
        )}

        <div
          ref={wrapRef}
          className={`w-full ${printMode ? 'h-[300px]' : 'h-[440px] md:h-[520px] rounded-2xl bg-gradient-to-b from-black/40 to-black/10'} overflow-hidden relative shadow-[0_20px_60px_rgba(0,0,0,0.35)]`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          <canvas ref={canvasRef} className="absolute inset-0" />

          {/* Selection overlay (Alt+Drag) */}
          {selection && !printMode && (
            <div
              className="absolute top-0 bottom-0 z-10 pointer-events-none"
              style={{
                left: Math.min(selection.x0, selection.x1),
                width: Math.max(1, Math.abs(selection.x1 - selection.x0)),
                background: 'rgba(167,139,250,0.10)',
                borderLeft: '1px solid rgba(167,139,250,0.35)',
                borderRight: '1px solid rgba(167,139,250,0.35)',
              }}
            />
          )}

          {rangeMenu && !printMode && (
            <div
              className="absolute z-40 bg-black/85 rounded-xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.55)] p-2 text-xs backdrop-blur-xl"
              style={{ left: rangeMenu.x, top: rangeMenu.y, width: 250 }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[10px] text-textMuted font-mono">
                {new Date(rangeMenu.start).toISOString().slice(11, 19)} .. {new Date(rangeMenu.end).toISOString().slice(11, 19)}
              </div>
              <div className="grid grid-cols-2 gap-2 p-1">
                <button
                  type="button"
                  className="px-2 py-1.5 rounded-lg text-[11px] font-bold border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => { zoomToRange(rangeMenu.start, rangeMenu.end); setRangeMenu(null); }}
                >
                  {lang === 'ru' ? 'Зум сюда' : lang === 'uk' ? 'Зум сюди' : 'Zoom'}
                </button>
                <button
                  type="button"
                  className="px-2 py-1.5 rounded-lg text-[11px] font-bold border border-white/10 bg-transparent text-textMuted hover:text-white hover:bg-white/5"
                  onClick={() => { resetZoom(); setRangeMenu(null); setSelection(null); }}
                >
                  {t.reset}
                </button>
                <button
                  type="button"
                  className="px-2 py-1.5 rounded-lg text-[11px] font-bold border border-white/10 bg-transparent text-textMuted hover:text-white hover:bg-white/5"
                  onClick={() => copyRange(rangeMenu.start, rangeMenu.end)}
                >
                  {lang === 'ru' ? 'Копировать' : lang === 'uk' ? 'Копіювати' : 'Copy'}
                </button>
                <button
                  type="button"
                  className="px-2 py-1.5 rounded-lg text-[11px] font-bold border border-white/10 bg-transparent text-textMuted hover:text-white hover:bg-white/5"
                  onClick={() => copyRangePrompt(rangeMenu.start, rangeMenu.end)}
                >
                  {lang === 'ru' ? 'Промпт' : lang === 'uk' ? 'Промпт' : 'Prompt'}
                </button>
                <button
                  type="button"
                  className="col-span-2 px-2 py-1.5 rounded-lg text-[11px] font-bold border border-white/10 bg-transparent text-textMuted hover:text-white hover:bg-white/5"
                  onClick={() => exportSelectionPNG(rangeMenu.start, rangeMenu.end)}
                >
                  {lang === 'ru' ? 'Скачать PNG выделения' : lang === 'uk' ? 'Завантажити PNG' : 'Download PNG'}
                </button>
                <button
                  type="button"
                  className="col-span-2 px-2 py-1.5 rounded-lg text-[11px] font-bold border border-white/10 bg-transparent text-textMuted hover:text-white hover:bg-white/5"
                  onClick={() => { setRangeMenu(null); setSelection(null); }}
                >
                  {lang === 'ru' ? 'Закрыть' : lang === 'uk' ? 'Закрити' : 'Close'}
                </button>
              </div>
            </div>
          )}

          {tooltip && !printMode && (
            <div
              className="absolute z-30 bg-black/80 p-3 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.45)] border border-white/10 text-xs backdrop-blur-xl"
              style={{
                left: Math.min(Math.max((hover?.x ?? 0) + 14, 12), (wrapRef.current?.clientWidth ?? 600) - 220),
                top: Math.min(Math.max((hover?.y ?? 0) - 40, 12), (wrapRef.current?.clientHeight ?? 500) - 140),
                pointerEvents: 'none',
              }}
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2 mb-2">
                <div className="leading-tight">
                  <div className="text-white font-extrabold tracking-tight">{tooltip.time}</div>
                  <div className="text-textMuted text-[10px]">{tooltip.date}</div>
                </div>
                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${tooltip.session ? 'bg-violet-500/20 text-violet-200' : 'bg-white/5 text-textMuted'}`}>
                  {tooltip.session ? (lang === 'ru' ? 'СЕССИЯ' : lang === 'uk' ? 'СЕСІЯ' : 'SESSION') : (lang === 'ru' ? 'ПРОСТОЙ' : lang === 'uk' ? 'ПРОСТІЙ' : 'IDLE')}
                  {tooltip.session ? ` · TX:${tooltip.tx ?? ''} · C:${tooltip.conn}${tooltip.sessStatus ? ` · ${tooltip.sessStatus}` : ''}${tooltip.sessErr ? ` (${tooltip.sessErr})` : ''}` : ''}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {tooltip.lines.map((l) => (
                  <div key={l.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: l.color }} />
                      <span className="text-textMuted">{l.label}</span>
                    </div>
                    <div className="text-white font-bold">{l.value}</div>
                  </div>
                ))}
                <div className="col-span-2 text-[10px] text-textMuted pt-1">
                  Δ {tooltip.delta?.toFixed?.(1) ?? ''} · {lang === 'ru' ? 'Файл' : 'File'}: {tooltip.dataset} · {lang === 'ru' ? 'Коннектор' : 'Connector'}: {tooltip.conn}{tooltip.connectorType ? ` · ${tooltip.connectorType}` : ''}{tooltip.controllerVersion ? ` · CTRL:${tooltip.controllerVersion}` : ''}{tooltip.model ? ` · ${tooltip.model}` : ''}{tooltip.fw ? ` · FW:${tooltip.fw}` : ''}{tooltip.controllerName ? ` · ${tooltip.controllerName}` : ''}
                </div>
              </div>
            </div>
          )}

          {showBadTs && badTimestampSamples.length > 0 && !printMode && (
            <div className="absolute left-3 right-3 bottom-3 z-20 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 p-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="font-extrabold">{t.badTs}: {badTimestampCount}</div>
                <button type="button" className="px-2 py-1 rounded-lg text-[11px] font-bold border border-white/10 bg-white/5 text-white" onClick={() => setShowBadTs(false)}>
                  {lang === 'ru' ? 'Закрыть' : lang === 'uk' ? 'Закрити' : 'Close'}
                </button>
              </div>
              <div className="mt-2 space-y-1 max-h-24 overflow-auto text-[11px] text-red-100/90">
                {badTimestampSamples.slice(0, 8).map((s, i) => (
                  <div key={i} className="font-mono opacity-90">{s}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
