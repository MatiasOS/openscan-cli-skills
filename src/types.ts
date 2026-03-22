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
    to: string | null;
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
    logsCount: number;
    logs: TxDebugLog[];
  } | null;
  revertReason: string | null;
  trace: any;
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
