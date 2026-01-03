
import { VoltagePoint, VoltageTriplet, FileData } from '../types';

const extractJsonFrom = (text: string, start: number): any | null => {
  const i = text.indexOf('{', start);
  if (i < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  
  for (let j = i; j < text.length; j++) {
    const ch = text[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(i, j + 1));
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
};

const normPhase = (p: string | any): 'L1' | 'L2' | 'L3' | null => {
  if (!p) return null;
  const s = String(p).toUpperCase();
  if (s.includes('L1')) return 'L1';
  if (s.includes('L2')) return 'L2';
  if (s.includes('L3')) return 'L3';
  return null;
};

// Robust date parser that handles various formats and ensures Number output
const parseISO = (t: string | number): number | null => {
  if (!t) return null;
  // If it's already a number (timestamp), return it
  if (typeof t === 'number') return t;
  
  const d = new Date(t);
  const time = d.getTime();
  return isNaN(time) ? null : time;
};

// Timestamp sanity bounds (prevents charts collapsing to year 2000 etc.)
const MIN_REASONABLE_TS = Date.UTC(2015, 0, 1); // 2015-01-01
const MAX_REASONABLE_TS = () => Date.now() + 7 * 24 * 60 * 60 * 1000; // now + 7d

export const evaluateStatus = (t: VoltageTriplet, vmin: number, vmax: number) => {
    const vals = [t.L1, t.L2, t.L3].filter(v => v !== null) as number[];
    const deviations: string[] = [];
    let status: VoltageTriplet['status'] = 'ok';

    if (vals.length > 0) {
      const over = vals.filter(v => v > vmax);
      const under = vals.filter(v => v < vmin);

      if (over.length) {
        deviations.push(`High`);
        status = 'over';
      }
      if (under.length) {
        deviations.push(`Low`);
        if (status !== 'over') status = 'under';
      }
      if (t.delta >= 15) { 
        deviations.push(`Δ ${t.delta.toFixed(0)}V`);
        if (status === 'ok') status = 'imbalance';
      }
    }
    return { status, deviationDetails: deviations };
};

export const parseLogFile = async (file: File, vmin: number, vmax: number): Promise<FileData> => {
  const text = await file.text();
  const points: VoltagePoint[] = [];
  const alertCounts: Record<string, number> = {};
  const parsingErrors: string[] = []; // Track bad lines
  
  // --- Enriched context (best-effort) ---
  const bootInfo: { chargePointVendor?: string; chargePointModel?: string; firmwareVersion?: string } = {};
  const connectorTypeById: Record<number, string> = {};
  let globalConnectorType: string | undefined;
  const controllerVersionByConnectorId: Record<number, string> = {};
  const controllerNameByConnectorId: Record<number, string> = {};

  const payloadOf = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.payload && typeof obj.payload === 'object') return obj.payload;
    if (obj.data && typeof obj.data === 'object') return obj.data;
    if (obj.params && typeof obj.params === 'object') return obj.params;
    return obj;
  };

  const getCI = (obj: any, key: string): any => {
    if (!obj || typeof obj !== 'object') return undefined;
    if (key in obj) return (obj as any)[key];
    const lk = key.toLowerCase();
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase() === lk) return (obj as any)[k];
    }
    return undefined;
  };

  const isPlainObject = (v: any) => !!v && typeof v === 'object' && !Array.isArray(v);

  const deepFindString = (
    root: any,
    keyRe: RegExp,
    valueRe?: RegExp,
    maxDepth = 7,
  ): string | undefined => {
    const seen = new Set<any>();
    const stack: { v: any; d: number }[] = [{ v: root, d: 0 }];
    while (stack.length) {
      const { v, d } = stack.pop()!;
      if (!v || d > maxDepth) continue;
      if (typeof v === 'string') continue;
      if (typeof v !== 'object') continue;
      if (seen.has(v)) continue;
      seen.add(v);

      if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) stack.push({ v: v[i], d: d + 1 });
        continue;
      }

      for (const k of Object.keys(v)) {
        const child = (v as any)[k];
        if (keyRe.test(k)) {
          if (typeof child === 'string' || typeof child === 'number') {
            const s = String(child).trim();
            if (s && (!valueRe || valueRe.test(s))) return s;
          }
        }
        if (isPlainObject(child) || Array.isArray(child)) stack.push({ v: child, d: d + 1 });
      }
    }
    return undefined;
  };

  const looksLikeVersion = (s: string) =>
    /^[A-Za-z0-9][A-Za-z0-9._\-]{1,60}$/.test(s) && /\d/.test(s);

  const normalizeConnectorType = (raw: string): string | undefined => {
    const s = String(raw || '').trim();
    if (!s) return undefined;
    const u = s.toUpperCase().replace(/\s+/g, '');
    if (u.includes('CCS')) return u.includes('CCS2') ? 'CCS2' : 'CCS';
    if (u.includes('CHADEMO')) return 'CHAdeMO';
    if (u.includes('TYPE2') || u.includes('IEC62196T2') || u.includes('IEC62196-2')) return 'Type2';
    if (u.includes('GBT') || u.includes('GB/T')) return 'GB/T';
    if (u.includes('NACS') || u.includes('TESLA')) return 'NACS';
    if (/^[A-Za-z0-9][A-Za-z0-9/._\-]{1,20}$/.test(s) && /[A-Za-z]/.test(s)) return s;
    return undefined;
  };

  const parseHardwareInfoData = (data: string) => {
    // data format: "LCD_Screen=on;EEPROM=...;conn1=Chademo;conn2=CCS;...;charger0=EVCC-DC-02/C32K/Chademo/1/...;charger1=EVCC-CCS-20/S56_/CCS/1/..."
    const parts = String(data || '').split(';').map(s => s.trim()).filter(Boolean);
    const kv: Record<string, string> = {};
    for (const p of parts) {
      const i = p.indexOf('=');
      if (i <= 0) continue;
      const k = p.slice(0, i).trim();
      const v = p.slice(i + 1).trim();
      if (!k || !v) continue;
      kv[k] = v;
    }

    // connN => connectorTypeById[N]
    for (const [k, v] of Object.entries(kv)) {
      const m = k.match(/^conn(\d+)$/i);
      if (m) {
        const cid = Number(m[1]);
        const nct = normalizeConnectorType(v);
        if (Number.isFinite(cid) && nct) connectorTypeById[cid] = nct;
      }
    }

    // chargerK => controllerVersionByConnectorId[K+1]
    for (const [k, v] of Object.entries(kv)) {
      const m = k.match(/^charger(\d+)$/i);
      if (!m) continue;
      const chargerIdx = Number(m[1]);
      if (!Number.isFinite(chargerIdx)) continue;
      const connectorId = chargerIdx + 1;

      // expected: NAME/VERSION/...
      const seg = String(v).split('/').map(x => x.trim()).filter(Boolean);
      const ctrlName = seg[0];
      const ctrlVer = seg[1];
      if (ctrlName) controllerNameByConnectorId[connectorId] = ctrlName;
      if (ctrlVer && looksLikeVersion(ctrlVer)) controllerVersionByConnectorId[connectorId] = ctrlVer;
    }
  };

  const maybeSetFirmware = (cand: any) => {
    if (bootInfo.firmwareVersion) return;
    if (cand === null || cand === undefined) return;
    const s = String(cand).trim();
    if (!s) return;
    if (!looksLikeVersion(s)) return;
    bootInfo.firmwareVersion = s;
  };

  const maybeSetVendorModel = (obj: any) => {
    const p = payloadOf(obj);
    if (!p) return;
    const vendor = getCI(p, 'chargePointVendor') ?? getCI(p, 'vendor') ?? getCI(p, 'cpVendor');
    const model = getCI(p, 'chargePointModel') ?? getCI(p, 'model') ?? getCI(p, 'cpModel');
    if (vendor && !bootInfo.chargePointVendor) bootInfo.chargePointVendor = String(vendor).trim();
    if (model && !bootInfo.chargePointModel) bootInfo.chargePointModel = String(model).trim();
  };

  const setConnectorTypeFromKey = (kRaw: string, vRaw: any) => {
    const v0 = (vRaw === null || vRaw === undefined) ? '' : String(vRaw).trim();
    const k = String(kRaw || '').trim();
    if (!k || !v0) return;

    const v = normalizeConnectorType(v0);
    if (!v) return;

    // per-connector keys: ConnectorType_1 / ConnectorType.1 / PortType1 / SocketType2
    const m = k.match(/(\d+)\s*$/) || k.match(/(connector|port|socket|outlet)\D*(\d+)/i);
    if (m) {
      const cid = Number(m[2] ?? m[1]);
      if (Number.isFinite(cid) && cid >= 0) connectorTypeById[cid] = v;
      return;
    }
    globalConnectorType = v;
  };
  
  const statusTimeline: Record<number, { ts: number; status?: string; errorCode?: string }[]> = {};
  const txSpansByTx: Record<string, { tx: string; connectorId: number; startTs: number; endTs: number; idTag?: string }> = {};

  const readAnyTimestamp = (o: any): number | null => {
    if (!o) return null;
    const cand = o.timestamp ?? o.timeStamp ?? o.ts ?? o.time ?? o.datetime ?? o.dateTime;
    return parseISO(cand);
  };

  const pushStatus = (connectorId: number, ts: number, status?: string, errorCode?: string) => {
    if (!statusTimeline[connectorId]) statusTimeline[connectorId] = [];
    statusTimeline[connectorId].push({ ts, status, errorCode });
  };

  const lines = text.split(/\r?\n/);
  for (const ln of lines) {
    const s = ln.toUpperCase();
    if (s.includes('AC') && s.includes('L1') && s.includes('L2') && s.includes('L3')) {
       const key = 'Voltage Alert'; 
       alertCounts[key] = (alertCounts[key] || 0) + 1;
    }
  }

  // --- Pre-scan: BootNotification / StatusNotification / GetConfiguration / (optional) Start/StopTransaction ---
  let idx = 0;

  const scan = (marker: string, handler: (obj: any, pos: number) => void) => {
    let j = 0;
    while (true) {
      const p = text.indexOf(marker, j);
      if (p < 0) break;
      const obj = extractJsonFrom(text, p);
      if (obj) handler(obj, p);
      j = p + marker.length;
    }
  };

  scan('BootNotification', (obj) => {
    maybeSetVendorModel(obj);
    const p = payloadOf(obj);
    if (!p) return;

    const fw =
      getCI(p, 'firmwareVersion') ??
      getCI(p, 'firmware') ??
      getCI(p, 'fwVersion') ??
      getCI(p, 'swVersion') ??
      getCI(p, 'softwareVersion') ??
      getCI(p, 'controllerVersion') ??
      getCI(p, 'version');
    if (fw) maybeSetFirmware(fw);

    const deepFw =
      deepFindString(p, /(firmware|fw|software|sw|controller).*(version|ver|rev)$/i) ??
      deepFindString(p, /(firmwareVersion|fwVersion|softwareVersion|swVersion|controllerVersion)$/i);
    if (deepFw) maybeSetFirmware(deepFw);
  });
  
  // Best-effort: some stations expose FW / connector info only via configuration
  scan('GetConfiguration', (obj) => {
    const p = payloadOf(obj);
    if (!p) return;
    const list =
      getCI(p, 'configurationKey') ??
      getCI(p, 'configurationKeys') ??
      getCI(p, 'configuration') ??
      getCI(p, 'keyValues') ??
      getCI(p, 'conf') ??
      getCI(p, 'result');
    if (!Array.isArray(list)) return;
    for (const it of list) {
      const key = getCI(it, 'key') ?? getCI(it, 'name');
      const val = getCI(it, 'value') ?? getCI(it, 'val') ?? getCI(it, 'currentValue');
      if (!key || val === undefined) continue;
      const k = String(key);
      const kl = k.toLowerCase();
      const vs = String(val).trim();

      if (!bootInfo.firmwareVersion) {
        const isVersionKey =
          kl.includes('firmware') ||
          kl.includes('fw') ||
          (kl.includes('software') && kl.includes('version')) ||
          (kl.includes('sw') && kl.includes('version')) ||
          (kl.includes('controller') && kl.includes('version')) ||
          (kl.includes('app') && kl.includes('version'));
        if (isVersionKey) maybeSetFirmware(vs);
      }

      const keyHintsConnector =
        kl.includes('connector') || kl.includes('evse') || kl.includes('port') || kl.includes('socket') || kl.includes('outlet') || kl.includes('plug');
      const keyHintsType =
        kl.includes('type') || kl.includes('standard') || kl.includes('format') || kl.includes('kind') || kl.includes('plug');
      const valueLooksType = !!normalizeConnectorType(vs);

      if ((keyHintsConnector && keyHintsType) || (keyHintsConnector && valueLooksType)) {
        setConnectorTypeFromKey(k, vs);
      }
    }
  });

  scan('DataTransfer', (obj) => {
    maybeSetVendorModel(obj);
    const p = payloadOf(obj);
    if (!p) return;

    // Handle "hardwareInfo" specifically
    const msgId =
      getCI(p, 'messageId') ??
      getCI(p, 'messageID') ??
      getCI(p, 'msgId') ??
      getCI(p, 'msgID');
    const msgIdStr = msgId ? String(msgId) : '';

    if (/hardwareinfo/i.test(msgIdStr)) {
      const dataField = getCI(p, 'data') ?? getCI(p, 'payload') ?? getCI(p, 'value');
      // sometimes dataField can be object or stringified json; we only parse string format with key=value;...
      if (typeof dataField === 'string') {
        parseHardwareInfoData(dataField);
      } else if (dataField && typeof dataField === 'object') {
        // if vendor wraps it: { data: "..." }
        const inner = getCI(dataField, 'data');
        if (typeof inner === 'string') parseHardwareInfoData(inner);
      }
    }

    const fw =
      deepFindString(p, /(firmware|fw|software|sw|controller).*(version|ver|rev)$/i) ??
      deepFindString(p, /(firmwareVersion|fwVersion|softwareVersion|swVersion|controllerVersion)$/i);
    if (fw) maybeSetFirmware(fw);

    const connectors = getCI(p, 'connectors') ?? getCI(p, 'ports') ?? getCI(p, 'evse') ?? getCI(p, 'outlets');
    if (Array.isArray(connectors)) {
      for (const c of connectors) {
        const id = Number(getCI(c, 'id') ?? getCI(c, 'connectorId') ?? getCI(c, 'connector') ?? getCI(c, 'portId'));
        const typ = getCI(c, 'type') ?? getCI(c, 'connectorType') ?? getCI(c, 'standard') ?? getCI(c, 'plugType');
        if (Number.isFinite(id) && typ) setConnectorTypeFromKey(String(id), typ);
      }
    } else if (connectors && typeof connectors === 'object') {
      for (const [k, v] of Object.entries(connectors)) setConnectorTypeFromKey(k, v as any);
    }

    const ct = getCI(p, 'connectorType') ?? getCI(p, 'connectorStandard') ?? getCI(p, 'plugType');
    if (ct) setConnectorTypeFromKey('connectorType', ct);
  });

  scan('StatusNotification', (obj, pos) => {
    const conn = Number(obj.connectorId ?? 0);
    const ts = readAnyTimestamp(obj) ?? readAnyTimestamp(obj.payload) ?? null;
    if (ts === null) return;
    if (ts < MIN_REASONABLE_TS || ts > MAX_REASONABLE_TS()) {
      parsingErrors.push(`Suspicious timestamp (StatusNotification): "${obj.timestamp ?? obj.ts ?? ''}" -> ${new Date(ts).toISOString()} near char ${pos}`);
      return;
    }
    const st = obj.status ?? obj.statusInfo?.status;
    const err = obj.errorCode ?? obj.statusInfo?.errorCode;
    pushStatus(conn, ts, st ? String(st) : undefined, err ? String(err) : undefined);
  });

  // Optional: try to learn idTag for a transaction if present in the same JSON blob
  scan('StartTransaction', (obj) => {
    const tx = obj.transactionId ?? obj.transactionID;
    const conn = obj.connectorId ?? 1;
    const ts = readAnyTimestamp(obj);
    if (!tx || ts === null) return;
    const key = String(tx);
    const cur = txSpansByTx[key] ?? { tx: key, connectorId: Number(conn), startTs: ts, endTs: ts };
    cur.startTs = Math.min(cur.startTs, ts);
    cur.endTs = Math.max(cur.endTs, ts);
    cur.connectorId = Number(conn);
    if (obj.idTag) cur.idTag = String(obj.idTag);
    txSpansByTx[key] = cur;
  });
  scan('StopTransaction', (obj) => {
    const tx = obj.transactionId ?? obj.transactionID;
    const conn = obj.connectorId ?? 1;
    const ts = readAnyTimestamp(obj);
    if (!tx || ts === null) return;
    const key = String(tx);
    const cur = txSpansByTx[key] ?? { tx: key, connectorId: Number(conn), startTs: ts, endTs: ts };
    cur.startTs = Math.min(cur.startTs, ts);
    cur.endTs = Math.max(cur.endTs, ts);
    cur.connectorId = Number(conn);
    txSpansByTx[key] = cur;
  });

  // --- Fallback extraction from raw text (ONLY if present in log) ---
  const regexFind = (keyRe: RegExp) => {
    // matches: "key" : "value" or 'key': 'value' or "key":"value"
    const re = new RegExp(`["'](${keyRe.source})["']\\s*:\\s*["']([^"']{1,80})["']`, 'i');
    const m = text.match(re);
    return m ? String(m[2]).trim() : undefined;
  };

  if (!bootInfo.firmwareVersion) {
    const cand = regexFind(/firmwareVersion|fwVersion|softwareVersion|swVersion|controllerVersion|firmware|software/);
    if (cand) maybeSetFirmware(cand);
  }

  if (!globalConnectorType && Object.keys(connectorTypeById).length === 0) {
    const ct = regexFind(/connectorType|plugType|connectorStandard|socketType|portType|outletType|connectorFormat/);
    const nct = ct ? normalizeConnectorType(ct) : undefined;
    if (nct) globalConnectorType = nct;
  }

  // Sort status timelines
  for (const k of Object.keys(statusTimeline)) {
    statusTimeline[Number(k)].sort((a, b) => a.ts - b.ts);
  }

  while (true) {
    const pos = text.indexOf('MeterValues', idx);
    if (pos < 0) break;
    
    const obj = extractJsonFrom(text, pos);
    if (obj && obj.meterValue) {
      const conn = obj.connectorId || 1;
      const tx = obj.transactionId ?? obj.transactionID ?? obj.transactionid ?? null;

      for (const mv of (obj.meterValue || [])) {
        const dt = parseISO(mv.timestamp);
        
        // CRITICAL: Record invalid dates
        if (dt === null) {
            parsingErrors.push(`Invalid timestamp: "${mv.timestamp}" near char ${pos}`);
            continue;
        }

        // CRITICAL: Record suspicious-but-parseable timestamps (e.g. year 2000). Skip to avoid breaking timeline.
        if (dt < MIN_REASONABLE_TS || dt > MAX_REASONABLE_TS()) {
            parsingErrors.push(`Suspicious timestamp: "${mv.timestamp}" -> ${new Date(dt).toISOString()} near char ${pos}`);
            continue;
        }

        // Track session spans directly from MeterValues (transactionId present => active session)
        if (tx) {
          const key = String(tx);
          const cur = txSpansByTx[key] ?? { tx: key, connectorId: conn, startTs: dt, endTs: dt };
          cur.startTs = Math.min(cur.startTs, dt);
          cur.endTs = Math.max(cur.endTs, dt);
          cur.connectorId = conn;
          txSpansByTx[key] = cur;
        }

        for (const sv of (mv.sampledValue || [])) {
          const m = String(sv.measurand || '');
          const isVolts = m === 'Voltage' || /^Voltage(\.L[123])?$/i.test(m);
          
          if (!isVolts) continue;
          
          const phaseRaw = sv.phase || String(sv.measurand).split('.').pop();
          const phase = normPhase(phaseRaw);
          // Parse value safely, handling commas
          const val = parseFloat(String(sv.value ?? '').replace(',', '.'));
          
          if (phase && !isNaN(val) && val < 600) { 
             points.push({
               dataset: file.name,
               connectorId: conn,
               phase,
               ts: dt, // Guaranteed to be a number
               voltage: val
             });
          }
        }
      }
    }
    idx = pos + 12; 
  }

  points.sort((a, b) => a.ts - b.ts);
  
  const tripletMap = new Map<string, VoltageTriplet>();

  for (const p of points) {
    // Group by second to align phases
    const roundedTs = Math.floor(p.ts / 1000) * 1000; 
    const key = `${p.dataset}|${p.connectorId}|${roundedTs}`;
    
    if (!tripletMap.has(key)) {
      tripletMap.set(key, {
        id: key,
        ts: roundedTs, // Use rounded TS for consistency
        dataset: p.dataset,
        connectorId: p.connectorId,
        L1: null,
        L2: null,
        L3: null,
        delta: 0,
        status: 'ok',
        session: 'idle',
        deviationDetails: []
      });
    }
    const t = tripletMap.get(key)!;
    if (p.phase === 'L1') t.L1 = p.voltage;
    if (p.phase === 'L2') t.L2 = p.voltage;
    if (p.phase === 'L3') t.L3 = p.voltage;
  }

  // Build connector -> transaction spans (from MeterValues and optional Start/StopTransaction)
  const txSpansByConn: Record<number, { tx: string; connectorId: number; startTs: number; endTs: number; idTag?: string }[]> = {};
  for (const span of Object.values(txSpansByTx)) {
  if (!txSpansByConn[span.connectorId]) txSpansByConn[span.connectorId] = [];
  txSpansByConn[span.connectorId].push(span);
}
  for (const k of Object.keys(txSpansByConn)) {
  txSpansByConn[Number(k)].sort((a, b) => a.startTs - b.startTs);
}

  const triplets: VoltageTriplet[] = [];
  
  for (const t of tripletMap.values()) {
    const vals = [t.L1, t.L2, t.L3].filter(v => v !== null) as number[];
    
    if (vals.length > 0) {
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      t.delta = vals.length > 1 ? maxV - minV : 0;

      const { status, deviationDetails } = evaluateStatus(t, vmin, vmax);
      t.status = status;
      t.deviationDetails = deviationDetails;

      // Build connector->spans map lazily (after all MeterValues are read)
      // Find active tx for this connector at this timestamp (tolerance: +60s)
      const spans = txSpansByConn[t.connectorId] || [];
      let active: any = null;
      for (let i = spans.length - 1; i >= 0; i--) {
        const s = spans[i];
        if (t.ts + 60000 >= s.startTs && t.ts <= s.endTs + 60000) { active = s; break; }
        if (s.startTs < t.ts - 10 * 60 * 1000) break; // small early break for speed
      }

      if (active) {
        t.session = 'session';
        t.sessionId = active.tx;
        if (active.idTag) t.idTag = active.idTag;
      } else {
        t.session = 'idle';
      }

      // Attach device/session context
      if (bootInfo.chargePointVendor) t.chargePointVendor = bootInfo.chargePointVendor;
      if (bootInfo.chargePointModel) t.chargePointModel = bootInfo.chargePointModel;
      if (bootInfo.firmwareVersion) t.firmwareVersion = bootInfo.firmwareVersion;
      
      const ct = connectorTypeById[t.connectorId] || connectorTypeById[0] || globalConnectorType;
      if (ct) t.connectorType = ct;

      const cv = controllerVersionByConnectorId[t.connectorId];
      if (cv) t.controllerVersion = cv;
      const cn = controllerNameByConnectorId[t.connectorId];
      if (cn) t.controllerName = cn;

      const stArr = statusTimeline[t.connectorId] || statusTimeline[0] || [];
      if (stArr.length) {
        // last <= ts
        let lo = 0, hi = stArr.length - 1, best = -1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (stArr[mid].ts <= t.ts) { best = mid; lo = mid + 1; }
          else hi = mid - 1;
        }
        if (best >= 0) {
          t.sessionStatus = stArr[best].status;
          t.sessionErrorCode = stArr[best].errorCode;
        }
      }

      triplets.push(t);
    }
  }

  return {
    name: file.name,
    size: file.size,
    enabled: true,
    alertCounts,
    triplets: triplets.sort((a, b) => a.ts - b.ts),
    parsingErrors,
    rawText: text.substring(0, 100) 
  };
};
