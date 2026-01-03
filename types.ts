
export type Language = 'ru' | 'en' | 'uk';

export interface VoltagePoint {
  dataset: string;
  connectorId: number;
  phase: 'L1' | 'L2' | 'L3';
  ts: number; // Timestamp in ms
  voltage: number;
}

export interface VoltageTriplet {
  id: string; // unique key
  ts: number;
  dataset: string;
  connectorId: number;
  L1: number | null;
  L2: number | null;
  L3: number | null;
  delta: number;
  status: 'ok' | 'over' | 'under' | 'imbalance';
  session: 'session' | 'idle';
  sessionId?: string; // Transaction ID if available
  // Enriched session/device context (best-effort, depends on log contents)
  sessionStatus?: string; // StatusNotification.status at this moment
  sessionErrorCode?: string; // StatusNotification.errorCode at this moment
  idTag?: string; // StartTransaction.idTag if present
  chargePointVendor?: string;
  chargePointModel?: string;
  firmwareVersion?: string;
  controllerVersion?: string; // S56b / G38_ / C32K / C32W etc
  controllerName?: string;    // EVCC-CCS-20 etc
  connectorType?: string; // Type2 / CCS2 / CHAdeMO etc (if present in logs/config)
  deviationDetails: string[];
}

export interface FileData {
  name: string;
  size: number;
  enabled: boolean;
  alertCounts: Record<string, number>;
  triplets: VoltageTriplet[];
  parsingErrors: string[]; // NEW: Track corrupted lines
  rawText?: string;
}

export interface GlobalSettings {
  vmin: number;
  vmax: number;
  timezone: string;
}

export interface PhaseDetailedStats {
  min: number;
  max: number;
  avg: number;
  underCount: number;
  overCount: number;
  zeroCount: number; // outages
}

export interface AnalysisStats {
  totalPoints: number;
  startTime: number | null;
  endTime: number | null;
  durationHours: number;
  
  // Event Counters
  cntUnder: number;
  cntOver: number;
  cntImbalance: number;
  cntDeepDip: number; // < 190V
  cntInvalidDates: number; // NEW: Critical metric for log health
  maxDelta: number;
  
  riskLevel: 'low' | 'medium' | 'high';
  
  // Detailed Per-Phase Stats
  phases: {
    L1: PhaseDetailedStats;
    L2: PhaseDetailedStats;
    L3: PhaseDetailedStats;
  };
}
