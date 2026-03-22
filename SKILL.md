---
name: openscan-cli-skills
description: Query EVM and Bitcoin blockchain network stats — gas prices, fees, latest blocks, sync status, mempool, difficulty. Debug and explain transactions on any EVM network — trace execution, decode reverts, analyze gas, state changes, call trees, opcodes. Use when asked about gas, fees, network health, latest blocks, chain status, or to debug/explain transactions. Supports Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Avalanche, Sepolia, Hardhat, Bitcoin. Powered by @openscan/network-connectors and @openscan/metadata.
---

# OpenScan CLI

Query EVM and Bitcoin blockchain data. All output is JSON to stdout.

## How to Present Results

**IMPORTANT:** Never dump raw JSON to the user. Always interpret the data and provide human-readable insights tailored to the user's question.

### For `stats` results, always include:
- A plain-language summary answering the user's specific question
- Context on whether gas prices are low/normal/high (EVM: <10 gwei is low, 10-30 is normal, >30 is elevated, >100 is high)
- Block production health: are blocks recent? Is gas usage near limits?
- For Bitcoin: mempool congestion level, fee tier recommendations (use fast/medium/slow estimates)
- Any anomalies worth noting (sync issues, empty blocks, unusual gas patterns)

### For `debug-tx` results, always include:
- **Transaction summary**: What the transaction did (contract creation, token transfer, function call, etc.) in plain language
- **Success/failure verdict**: Clearly state whether the transaction succeeded or failed
- **If the transaction failed (`receipt.status === "reverted"`):**
  - Explain the `revertReason` in plain language (e.g., "The contract reverted with 'insufficient balance' — the sender tried to transfer more tokens than they held")
  - If the revert reason is a Panic code, explain what that panic means (e.g., Panic(0x11) = arithmetic overflow, Panic(0x01) = assertion failed, Panic(0x12) = division by zero, Panic(0x32) = array out of bounds)
  - Look at the `callTree` to identify which internal call reverted and explain the call chain that led to the failure
  - Check `stateChanges` to show what state was or wasn't modified before the revert
  - Suggest possible causes and fixes when the context makes it clear
- **Gas analysis**: Was gas efficiency reasonable? Did it run out of gas?
- **Key events emitted** (from `decodedEvents`): Summarize what happened on-chain
- **Decoded function call** (from `decodedInputData`): Explain what function was called with what parameters

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

Take your time to think and deep research to provide a comprehensive analysis of the network stats, including:
- Gas price trends and current levels (low/normal/high)
- Block production health: recent blocks, gas usage, and any anomalies
- Sync status and node health indicators

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

Provides a comprehensive analysis of the network stats, including:
- Gas price trends and current levels (low/normal/high)
- Block production health: recent blocks, gas usage, and any anomalies
- For Bitcoin: mempool congestion and fee tier recommendations


### debug-tx — Transaction Debugger

```bash
openscan debug-tx <txHash> [--chain <chain>] [--rpc <url>]
```

Debugs a transaction on any EVM network. Always includes execution trace and revert reason decoding. Requires the RPC node to support `debug_traceTransaction` (Hardhat, Anvil, Geth with `--http.api debug`, Erigon, etc.).

Provides a comprehensive analysis of the transaction, including:
- What Happened: Function calls, events, state changes
- Why It Failed (if applicable): Revert reason decoding, call tree analysis, state change review
- Gas Analysis: Total gas used, efficiency, and cost breakdown
- Call Tree: Annotated call tree with decoded calls and errors
- State Changes: Per-address balance, nonce, code, and storage diffs
- Opcode Trace: Paginated step-by-step opcode execution with stack and storage snapshots

**Output fields:**
- `chainId` — Numeric chain ID
- `networkName` — Human-readable network name
- `currency` — Native currency symbol
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
| "Debug this transaction 0x..." | `openscan debug-tx 0x...` |
| "Why did this tx revert?" | `openscan debug-tx 0x...` |
| "Trace transaction 0x..." | `openscan debug-tx 0x...` |
| "What happened in this tx on Base?" | `openscan debug-tx 0x... --chain base` |
| "What events did this tx emit?" | `openscan debug-tx 0x...` |
| "Decode the calldata for this tx" | `openscan debug-tx 0x...` |
| "Show me the call tree for this tx" | `openscan debug-tx 0x...` |
| "Where did gas go in this tx?" | `openscan debug-tx 0x...` |
| "What state changed in this tx?" | `openscan debug-tx 0x...` |
| "Show opcodes for this tx" | `openscan debug-tx 0x...` |

## Example Insights

### Stats insight example
User asks: "What's gas like on Ethereum?"
After running the command, respond like:
> Gas on Ethereum is currently **12.3 gwei** — that's in the normal range. The base fee is 11.8 gwei with a 0.5 gwei priority tip. The latest block (#19,234,567) used 62% of its gas limit with 184 transactions, which suggests moderate activity. Good time to submit non-urgent transactions.

### Failed transaction insight example
User asks: "Why did this tx fail?"
After running the command, respond like:
> This transaction **reverted** with `Error("ERC20: transfer amount exceeds balance")`.
>
> **What happened:** Address `0xAbC...` called `transfer(0xDeF..., 1000000000000000000)` on the USDC contract, attempting to send 1 USDC. However, the sender's balance was insufficient.
>
> **Call chain:** The top-level `transfer()` call delegated to an internal `_transfer()` which hit the balance check and reverted. No state changes were committed.
>
> **Gas:** 45,231 gas was used (60% of the 75,000 limit) before the revert.
>
> **Fix:** Ensure the sender has enough token balance before calling transfer, or add a balance check in your contract.

### Successful transaction insight example
User asks: "What happened in this tx?"
After running the command, respond like:
> This transaction **succeeded** — it was a `swap()` call on Uniswap V2 Router.
>
> **Action:** Swapped 0.5 ETH for ~1,234 USDC via the WETH/USDC pair.
>
> **Events:** 4 events emitted — `Transfer` (WETH deposit), `Sync` (pair reserves updated), `Swap` (actual swap), `Transfer` (USDC to recipient).
>
> **Gas:** Used 152,847 gas (76% of limit) at 15.2 gwei, costing ~0.0023 ETH ($4.12).

## Security

- **READ-ONLY** — no transaction signing, no private key handling
- Public RPCs only — no API keys needed by default
- Privacy-first RPC selection from metadata (tracking: "none")
