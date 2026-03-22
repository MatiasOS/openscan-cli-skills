export interface DecodedParam {
  name: string;
  type: string;
  value: string;
  indexed: boolean;
}

export interface DecodedInput {
  functionName: string;
  signature: string;
  params: DecodedParam[];
}

export interface DecodedEvent {
  name: string;
  signature: string;
  fullSignature: string;
  type: string;
  description: string;
  params: DecodedParam[];
}

export interface EthLog {
  address: string;
  topics: string[];
  data: string;
}

export interface ContractInfo {
  name?: string;
  abi?: unknown[];
}

export interface CallNode {
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
  calls?: CallNode[];
}

export interface PrestateAccountState {
  balance?: string;
  nonce?: number;
  code?: string;
  storage?: Record<string, string>;
}

export interface PrestateTrace {
  pre: Record<string, PrestateAccountState>;
  post: Record<string, PrestateAccountState>;
}

export interface TraceLog {
  pc: number;
  op: string;
  gas: number;
  gasCost: number;
  depth: number;
  stack: string[];
  memory?: string[];
  storage?: Record<string, string>;
}

export interface TraceResult {
  gas: number;
  failed: boolean;
  returnValue: string;
  structLogs: TraceLog[];
}
