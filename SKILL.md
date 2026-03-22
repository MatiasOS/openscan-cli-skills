---
name: openscan
description: Query EVM and Bitcoin blockchain network stats — gas prices, fees, latest blocks, sync status, mempool, difficulty. Use when asked about gas, fees, network health, latest blocks, or chain status. Supports Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Avalanche, Sepolia, Bitcoin. Powered by @openscan/network-connectors and @openscan/metadata.
---

# OpenScan CLI

Query EVM and Bitcoin blockchain data. All output is JSON to stdout.

## CLI Location

```bash
bun <skill_dir>/bin/openscan.ts <command> [args] [options]
```

## Commands

### stats — Network Statistics

```bash
openscan stats [--chain <chain>] [--strategy <strategy>] [--rpc <url>]
```

**EVM output fields:**
- `chainId` — Numeric chain ID
- `networkName` — Human-readable network name
- `currency` — Native currency symbol (ETH, MATIC, etc.)
- `gasPrice` / `gasPriceGwei` — Current gas price (wei + gwei)
- `baseFee` / `baseFeeGwei` — EIP-1559 base fee from latest block
- `maxPriorityFee` / `maxPriorityFeeGwei` — Max priority fee tip
- `blockNumber` — Latest block number
- `isSyncing` — Node sync status (false = fully synced)
- `clientVersion` — Node software version
- `latestBlocks` — 3 most recent blocks (number, hash, timestamp, gasUsed, gasLimit, txCount, baseFeePerGas)
- `explorerLink` — Direct link to OpenScan explorer

**Bitcoin output fields:**
- `networkId` — BIP-122 network identifier
- `networkName` — Human-readable network name
- `currency` — Native currency symbol (BTC, tBTC)
- `blockHeight` — Current block height
- `difficulty` — Proof-of-work difficulty
- `bestBlockHash` — Tip block hash
- `mempoolSize` — Number of unconfirmed transactions
- `mempoolBytes` — Mempool size in bytes
- `mempoolMinFee` — Minimum fee to enter mempool
- `estimatedFee` — Fee estimates in BTC/kB (fast: 2 blocks, medium: 6 blocks, slow: 24 blocks)
- `latestBlocks` — 3 most recent blocks (height, hash, timestamp, txCount, size, weight, difficulty)
- `explorerLink` — Link to mempool.space

### debug-tx — Transaction Debugger (Hardhat only)

```bash
openscan debug-tx <txHash> [--chain hardhat] [--rpc <url>]
```

Debugs a transaction on a local Hardhat node. Always includes execution trace and revert reason decoding.

**Output fields:**
- `chainId` — Chain ID (31337)
- `networkName` — Network name (Hardhat)
- `currency` — Native currency (ETH)
- `transaction` — Transaction details:
  - `hash`, `from`, `to`, `value`, `valueEth` — Basic tx info
  - `nonce`, `gas`, `type` — Tx metadata
  - `gasPrice` / `gasPriceGwei` — Gas price (legacy txs)
  - `maxFeePerGas` / `maxPriorityFeePerGas` — EIP-1559 fees (if applicable)
  - `blockNumber`, `blockHash`, `transactionIndex` — Inclusion info
  - `inputData`, `inputSize` — Calldata hex and byte length
  - `isContractCreation` — Whether this deployed a contract
- `receipt` — Receipt details:
  - `status` — `"success"`, `"reverted"`, or `"unknown"`
  - `gasUsed`, `cumulativeGasUsed` — Gas consumption
  - `effectiveGasPrice` / `effectiveGasPriceGwei` — Actual gas price paid
  - `gasEfficiency` — Percentage of gas limit used
  - `contractAddress` — Deployed contract address (if creation tx)
  - `logsCount`, `logs` — Emitted event logs (logIndex, address, topics, data)
- `revertReason` — Decoded revert reason for failed txs (Error(string), Panic codes, or custom error selector)
- `trace` — Full execution trace from `debug_traceTransaction` (call tree via callTracer)
- `decodedEvents` — Decoded event logs with signature lookup:
  - `total` — Number of logs emitted
  - `logs[]` — Per-log: `index`, `address`, `topics`, `data`, `decodeSource` (enrichedAbi/signatureDb/raw), `decoded` (name, signature, params with name/type/value/indexed)
- `decodedInputData` — Decoded function call input:
  - `rawInputData` — Raw hex calldata
  - `decodedCall` — Decoded function name, signature, and params (if ABI available)
  - `decodeSource` — How it was decoded (provided/enrichedAbi/none)
  - `utf8Text` — UTF-8 text interpretation (fallback when no ABI match)
- `callTree` — Annotated call tree with summary:
  - `summary` — `totalCalls`, `totalReverts`, `gasUsed`, `typeCounts` (CALL/STATICCALL/DELEGATECALL counts)
  - `root` — Recursive tree of annotated calls with `contractName`, `decodedCall`, `error`, `revertReason`
- `gasProfile` — Gas flame graph breakdown:
  - `totalGas`, `zoomGas`, `isZoomed`
  - `flame` — Recursive flame tree nodes with `label`, `gas`, `widthPct`, `color`, `type`
- `stateChanges` — Per-address state diffs:
  - `totalChangedAddresses` — Number of addresses with state changes
  - `changes[]` — Per-address: `balance` (before/after/diff), `nonce`, `code`, `storage[]` (slot/before/after)
- `rawTrace` — Paginated opcode-level trace:
  - `summary` — `steps`, `gas`, `failed`
  - `pagination` — `page`, `totalPages`, `fromStep`, `toStep`
  - `rows[]` — Per-step: `pc`, `op`, `gas`, `gasCost`, `depth`, `stack`, `storage`
- `explorerLink` — Link to local node

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--chain <chain>` | Chain alias or numeric ID | `ethereum` |
| `--strategy <strategy>` | RPC strategy: fallback, parallel, race | `fallback` |
| `--rpc <url>` | Override RPC endpoint | auto from metadata |

## Chain Aliases

| Alias | Chain ID | Network |
|-------|----------|---------|
| ethereum, eth, mainnet | 1 | Ethereum |
| optimism, op | 10 | Optimism |
| bnb, bsc | 56 | BNB Smart Chain |
| polygon, matic | 137 | Polygon |
| base | 8453 | Base |
| arbitrum, arb | 42161 | Arbitrum One |
| avalanche, avax | 43114 | Avalanche C-Chain |
| sepolia | 11155111 | Sepolia Testnet |
| bsctestnet, bnbtestnet | 97 | BNB Smart Chain Testnet |
| hardhat, localhost | 31337 | Hardhat (local dev) |
| aztec | 677868 | Aztec |
| bitcoin, btc | bip122:0000...1e93 | Bitcoin Mainnet |
| btc-testnet, bitcoin-testnet | bip122:0000...2ae | Bitcoin Testnet4 |

## Configuration

RPC URLs resolved in priority order:
1. `--rpc <url>` flag
2. `OPENSCAN_RPC_<CHAIN>` env var (e.g., `OPENSCAN_RPC_ETHEREUM`, `OPENSCAN_RPC_BITCOIN`)
3. `OPENSCAN_RPC_URL` env var
4. Auto-selected from `@openscan/metadata` (privacy-first endpoints)

## Output

All commands output JSON. Numeric values are pre-formatted:
- Gas prices (EVM): both wei (decimal string) and gwei
- Fee estimates (Bitcoin): BTC/kB
- Timestamps: ISO 8601
- Block numbers/heights: decimal integers
- Explorer links included for UI follow-up

## Natural Language Mapping

| User says | Command |
|-----------|---------|
| "What's gas like on Ethereum?" | `openscan stats` |
| "How's Base network doing?" | `openscan stats --chain base` |
| "What's the latest block on Arbitrum?" | `openscan stats --chain arbitrum` |
| "Is the Ethereum node synced?" | `openscan stats` |
| "Gas prices on Polygon?" | `openscan stats --chain polygon` |
| "BSC testnet gas?" | `openscan stats --chain bsctestnet` |
| "Check my local Hardhat node" | `openscan stats --chain hardhat --rpc http://localhost:8545` |
| "Bitcoin block height?" | `openscan stats --chain bitcoin` |
| "BTC fees right now?" | `openscan stats --chain btc` |
| "Bitcoin testnet status?" | `openscan stats --chain btc-testnet` |
| "How full is the Bitcoin mempool?" | `openscan stats --chain bitcoin` |
| "Debug this transaction 0x..." | `openscan debug-tx 0x... --chain hardhat` |
| "Why did this tx revert?" | `openscan debug-tx 0x... --chain hardhat` |
| "Trace transaction 0x..." | `openscan debug-tx 0x... --chain hardhat` |
| "What happened in this Hardhat tx?" | `openscan debug-tx 0x... --chain hardhat` |
| "What events did this tx emit?" | `openscan debug-tx 0x... --chain hardhat` |
| "Decode the calldata for this tx" | `openscan debug-tx 0x... --chain hardhat` |
| "Show me the call tree for this tx" | `openscan debug-tx 0x... --chain hardhat` |
| "Where did gas go in this tx?" | `openscan debug-tx 0x... --chain hardhat` |
| "What state changed in this tx?" | `openscan debug-tx 0x... --chain hardhat` |
| "Show opcodes for this tx" | `openscan debug-tx 0x... --chain hardhat` |

## Security

- **READ-ONLY** — no transaction signing, no private key handling
- Public RPCs only — no API keys needed by default
- Privacy-first RPC selection from metadata (tracking: "none")
