export interface BlockSummary {
  number: number;
  hash: string;
  timestamp: string;
  gasUsed: number;
  gasLimit: number;
  txCount: number;
  baseFeePerGas: string | null;
}

export interface NetworkStatsResult {
  chainId: number;
  networkName: string | null;
  currency: string | null;
  gasPrice: string;
  gasPriceGwei: string;
  baseFee: string | null;
  baseFeeGwei: string | null;
  maxPriorityFee: string | null;
  maxPriorityFeeGwei: string | null;
  blockNumber: number;
  isSyncing: boolean | object;
  clientVersion: string;
  latestBlocks: BlockSummary[];
  explorerLink: string;
}

export interface TxDebugLog {
  logIndex: number;
  address: string;
  topics: string[];
  data: string;
}

export interface TxDebugResult {
  chainId: number;
  networkName: string | null;
  currency: string | null;
  transaction: {
    hash: string;
    from: string;
    fromExplorerLink: string;
    to: string | null;
    toExplorerLink: string | null;
    value: string;
    valueEth: string;
    nonce: number;
    gas: number;
    gasPrice: string | null;
    gasPriceGwei: string | null;
    maxFeePerGas: string | null;
    maxFeePerGasGwei: string | null;
    maxPriorityFeePerGas: string | null;
    maxPriorityFeePerGasGwei: string | null;
    type: number;
    blockNumber: number | null;
    blockHash: string | null;
    transactionIndex: number | null;
    inputData: string;
    inputSize: number;
    isContractCreation: boolean;
  };
  receipt: {
    status: "success" | "reverted" | "unknown";
    gasUsed: number;
    cumulativeGasUsed: number;
    effectiveGasPrice: string | null;
    effectiveGasPriceGwei: string | null;
    gasEfficiency: string;
    contractAddress: string | null;
    contractAddressExplorerLink: string | null;
    logsCount: number;
    logs: TxDebugLog[];
  } | null;
  revertReason: string | null;
  trace: any;
  decodedEvents: import("./tx-analyser").EventsEntryOutput | null;
  decodedInputData: import("./tx-analyser").InputDataEntryOutput | null;
  callTree: import("./tx-analyser").CallTreeEntryOutput | null;
  gasProfile: import("./tx-analyser").GasProfilerEntryOutput | null;
  stateChanges: import("./tx-analyser").StateChangesEntryOutput | null;
  rawTrace: import("./tx-analyser").RawTraceEntryOutput | null;
  explorerLink: string;
}

export interface BtcBlockSummary {
  height: number;
  hash: string;
  timestamp: string;
  txCount: number;
  size: number;
  weight: number;
  difficulty: number;
}

export interface BtcTxInput {
  index: number;
  prevTxid: string | null;
  prevVout: number | null;
  value: number | null;
  address: string | null;
  scriptSig: { asm: string; hex: string } | null;
  witness: string[] | null;
  sequence: number;
  sequenceHex: string;
  scriptType: string | null;
  coinbase: string | null;
}

export interface BtcTxOutput {
  index: number;
  value: number;
  address: string | null;
  scriptPubKey: { asm: string; hex: string; type: string; desc?: string };
  scriptType: string;
  isSpent: boolean | null;
}

export interface BtcAddressInfo {
  address: string;
  isValid: boolean;
  type: string | null;
  witnessVersion: number | null;
  role: "input" | "output" | "both";
}

export interface BtcMempoolDetails {
  isInMempool: boolean;
  entry: {
    vsize: number;
    weight: number;
    fees: { base: number; modified: number; ancestor: number; descendant: number };
    time: string;
    height: number;
    ancestorCount: number;
    ancestorSize: number;
    descendantCount: number;
    descendantSize: number;
    depends: string[];
    spentby: string[];
  } | null;
  ancestors: Record<string, unknown> | null;
  descendants: Record<string, unknown> | null;
}

export interface BtcBlockInclusion {
  isConfirmed: boolean;
  blockhash: string | null;
  blockHeight: number | null;
  blockTime: string | null;
  confirmations: number | null;
  positionInBlock: number | null;
  blockTxCount: number | null;
  blockSize: number | null;
  blockWeight: number | null;
}

export interface BtcFeeAnalysis {
  totalInputValue: number | null;
  totalOutputValue: number;
  fee: number | null;
  feeSats: number | null;
  feeRate: number | null;
  currentFeeEstimates: {
    fast: { feeRate: number | null; blocks: number };
    medium: { feeRate: number | null; blocks: number };
    slow: { feeRate: number | null; blocks: number };
  };
  feeAssessment: string | null;
}

export interface BtcTxDebugResult {
  networkId: string;
  networkName: string | null;
  currency: string | null;
  transaction: {
    txid: string;
    hash: string;
    version: number;
    size: number;
    vsize: number;
    weight: number;
    locktime: number;
    locktimeInterpretation: string;
    isSegWit: boolean;
    isRBF: boolean;
    isCoinbase: boolean;
    confirmations: number | null;
  };
  inputs: BtcTxInput[];
  outputs: BtcTxOutput[];
  feeAnalysis: BtcFeeAnalysis;
  blockInclusion: BtcBlockInclusion | null;
  mempool: BtcMempoolDetails | null;
  addresses: BtcAddressInfo[];
  transactionTypeClassification: string;
  explorerLink: string;
}

export interface BitcoinStatsResult {
  networkId: string;
  networkName: string | null;
  currency: string | null;
  blockHeight: number;
  difficulty: number;
  bestBlockHash: string;
  mempoolSize: number;
  mempoolBytes: number;
  mempoolMinFee: number;
  estimatedFee: {
    fast: number | null;
    medium: number | null;
    slow: number | null;
  };
  latestBlocks: BtcBlockSummary[];
  explorerLink: string;
}
