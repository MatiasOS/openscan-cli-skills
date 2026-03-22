import type {
  CallNode,
  ContractInfo,
  DecodedEvent,
  DecodedInput,
  DecodedParam,
  EthLog,
  PrestateTrace,
  TraceResult,
} from "./domain";

export type EventDecodeSource = "enrichedAbi" | "txRecipientAbi" | "signatureDb" | "raw";

export interface EventsEntryInput {
  logs: EthLog[];
  txToAddress?: string;
  contractAbi?: unknown[];
  contracts?: Record<string, ContractInfo>;
}

export interface DecodedEventPayload {
  name: string;
  signature: string;
  params: DecodedParam[];
  fullSignature?: string;
  type?: string;
  description?: string;
}

export interface EventEntryItem {
  index: number;
  address: string;
  topics: string[];
  data: string;
  decodeSource: EventDecodeSource;
  decoded: DecodedEventPayload | null;
}

export interface EventsEntryOutput {
  total: number;
  logs: EventEntryItem[];
}

export type InputDecodeSource = "provided" | "enrichedAbi" | "none";

export interface InputDataEntryInput {
  inputData: string;
  decodedInput?: DecodedInput | null;
  txToAddress?: string;
  contracts?: Record<string, ContractInfo>;
}

export interface InputDataEntryOutput {
  rawInputData: string;
  decodedCall: DecodedInput | null;
  decodeSource: InputDecodeSource;
  utf8Text: string | null;
}

export interface CallTreeEntryInput {
  root: CallNode;
  contracts?: Record<string, ContractInfo>;
}

export interface AnnotatedCallNode {
  type: string;
  from: string;
  to?: string;
  value?: string;
  gas?: string;
  gasUsed?: string;
  input?: string;
  output?: string;
  error?: string;
  revertReason?: string;
  contractName?: string;
  decodedCall: DecodedInput | null;
  calls?: AnnotatedCallNode[];
}

export interface CallTreeSummary {
  totalCalls: number;
  totalReverts: number;
  gasUsed?: number;
  typeCounts: Record<string, number>;
}

export interface CallTreeEntryOutput {
  summary: CallTreeSummary;
  root: AnnotatedCallNode;
}

export interface GasProfilerEntryInput {
  root: CallNode;
  contracts?: Record<string, ContractInfo>;
  selectedPath?: number[];
}

export interface FlameNode {
  label: string;
  gas: number;
  widthPct: number;
  color: string;
  type: string;
  to?: string;
  error?: string;
  children: FlameNode[];
}

export interface BreakdownEntry {
  label: string;
  gas: number;
  pct: number;
  color: string;
  type: string;
  to?: string;
}

export interface GasProfilerSelection {
  path: number[];
  label: string;
  gas: number;
  breakdown: BreakdownEntry[];
}

export interface GasProfilerEntryOutput {
  totalGas: number;
  zoomGas: number;
  isZoomed: boolean;
  flame: FlameNode;
  selection: GasProfilerSelection | null;
}

export interface StateChangesEntryInput {
  trace: PrestateTrace;
  contracts?: Record<string, ContractInfo>;
}

export interface StorageSlotChange {
  slot: string;
  before: string;
  after: string;
}

export interface AddressStateChange {
  address: string;
  contractName?: string;
  balance: {
    before: string;
    after: string;
    diff: string;
  } | null;
  nonce: {
    before: number | null;
    after: number | null;
    diff: number;
  } | null;
  code: {
    before: string | null;
    after: string | null;
    changed: boolean;
  } | null;
  storage: StorageSlotChange[];
}

export interface StateChangesEntryOutput {
  totalChangedAddresses: number;
  changes: AddressStateChange[];
}

export interface RawTraceEntryInput {
  trace: TraceResult;
  page?: number;
  opcodesPerPage?: number;
  expandedSteps?: number[];
}

export interface RawTraceRow {
  step: number;
  pc: number;
  op: string;
  gas: number;
  gasCost: number;
  depth: number;
  color?: string;
  isExpanded: boolean;
  stack?: string[];
  storage?: Record<string, string>;
}

export interface RawTraceEntryOutput {
  summary: {
    steps: number;
    gas: number;
    failed: boolean;
  };
  pagination: {
    page: number;
    totalPages: number;
    fromStep: number;
    toStep: number;
    opcodesPerPage: number;
  };
  rows: RawTraceRow[];
}

export type {
  CallNode,
  ContractInfo,
  DecodedEvent,
  DecodedInput,
  EthLog,
  PrestateTrace,
  TraceResult,
};
