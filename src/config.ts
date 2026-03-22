import { getRpcEndpoints } from "./metadata";
import {
  BITCOIN_MAINNET,
  BITCOIN_TESTNET4,
} from "@openscan/network-connectors";

export type NetworkId = number | string;

const CHAIN_ALIASES: Record<string, NetworkId> = {
  ethereum: 1,
  eth: 1,
  mainnet: 1,
  optimism: 10,
  op: 10,
  bnb: 56,
  bsc: 56,
  polygon: 137,
  matic: 137,
  base: 8453,
  arbitrum: 42161,
  arb: 42161,
  avalanche: 43114,
  avax: 43114,
  sepolia: 11155111,
  bsctestnet: 97,
  bnbtestnet: 97,
  hardhat: 31337,
  localhost: 31337,
  aztec: 677868,
  bitcoin: BITCOIN_MAINNET,
  btc: BITCOIN_MAINNET,
  "btc-testnet": BITCOIN_TESTNET4,
  "bitcoin-testnet": BITCOIN_TESTNET4,
  btctestnet: BITCOIN_TESTNET4,
};

const NETWORK_NAMES: Record<string, string> = {
  "1": "ETHEREUM",
  "10": "OPTIMISM",
  "56": "BNB",
  "137": "POLYGON",
  "8453": "BASE",
  "42161": "ARBITRUM",
  "43114": "AVALANCHE",
  "11155111": "SEPOLIA",
  "97": "BSC_TESTNET",
  "31337": "HARDHAT",
  "677868": "AZTEC",
  [BITCOIN_MAINNET]: "BITCOIN",
  [BITCOIN_TESTNET4]: "BITCOIN_TESTNET4",
};

export function isBitcoinNetwork(networkId: NetworkId): boolean {
  return typeof networkId === "string" && networkId.startsWith("bip122:");
}

export function resolveChainId(input: string): NetworkId {
  const lower = input.toLowerCase();
  if (CHAIN_ALIASES[lower] !== undefined) return CHAIN_ALIASES[lower];
  // Support raw bip122 IDs
  if (input.startsWith("bip122:")) return input;
  const num = Number(input);
  if (Number.isInteger(num) && num > 0) return num;
  throw new Error(`Unknown chain: "${input}". Use a chain alias (ethereum, base, bitcoin, ...) or numeric chain ID.`);
}

export async function resolveRpcUrls(
  networkId: NetworkId,
  flags: { rpc?: string } = {},
): Promise<string[]> {
  // 1. Explicit --rpc flag
  if (flags.rpc) return [flags.rpc];

  // 2. Chain-specific env var: OPENSCAN_RPC_ETHEREUM, OPENSCAN_RPC_BITCOIN, etc.
  const networkName = NETWORK_NAMES[String(networkId)];
  if (networkName) {
    const envVar = process.env[`OPENSCAN_RPC_${networkName}`];
    if (envVar) return envVar.split(",").map((u) => u.trim());
  }

  // 3. Generic env var
  if (process.env.OPENSCAN_RPC_URL) {
    return process.env.OPENSCAN_RPC_URL.split(",").map((u) => u.trim());
  }

  // 4. Auto-select from @openscan/metadata
  const endpoints = await getRpcEndpoints(networkId);
  if (endpoints.length > 0) return endpoints.slice(0, 3);

  throw new Error(`No RPC URLs found for network ${networkId}. Set OPENSCAN_RPC_${networkName ?? networkId} or use --rpc <url>.`);
}

export type Strategy = "fallback" | "parallel" | "race";

export function resolveStrategy(input?: string): Strategy {
  if (!input) return "fallback";
  const lower = input.toLowerCase();
  if (lower === "fallback" || lower === "parallel" || lower === "race") return lower;
  throw new Error(`Unknown strategy: "${input}". Use fallback, parallel, or race.`);
}
