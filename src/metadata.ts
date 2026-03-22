import { resolve } from "path";
import type { NetworkId } from "./config";
import { isBitcoinNetwork } from "./config";
import {
  BITCOIN_MAINNET,
  BITCOIN_TESTNET4,
} from "@openscan/network-connectors";

const METADATA_BASE = resolve(import.meta.dir, "../node_modules/@openscan/metadata/dist");

interface RpcEndpoint {
  url: string;
  tracking: string;
  isOpenSource: boolean;
  provider: string;
  isPublic: boolean;
}

interface RpcFile {
  networkId: string;
  updatedAt: string;
  endpoints: RpcEndpoint[];
}

interface Network {
  type: string;
  networkId: string;
  chainId?: number;
  name: string;
  shortName: string;
  description: string;
  currency: string;
  color: string;
  isTestnet: boolean;
}

interface NetworksFile {
  updatedAt: string;
  count: number;
  networks: Network[];
}

const BITCOIN_RPC_FILES: Record<string, string> = {
  [BITCOIN_MAINNET]: "btc/mainnet.json",
  [BITCOIN_TESTNET4]: "btc/testnet4.json",
};

// Module-level cache
let networksCache: NetworksFile | null = null;

function selectEndpoints(data: RpcFile): string[] {
  // Prefer privacy-first (tracking: "none"), then any public endpoint
  const privacyEndpoints = data.endpoints.filter((e) => e.tracking === "none" && e.isPublic);
  if (privacyEndpoints.length > 0) return privacyEndpoints.map((e) => e.url);
  return data.endpoints.filter((e) => e.isPublic).map((e) => e.url);
}

export async function getRpcEndpoints(networkId: NetworkId): Promise<string[]> {
  let path: string;

  if (isBitcoinNetwork(networkId)) {
    const rpcFile = BITCOIN_RPC_FILES[networkId as string];
    if (!rpcFile) return [];
    path = `${METADATA_BASE}/rpcs/${rpcFile}`;
  } else {
    path = `${METADATA_BASE}/rpcs/evm/${networkId}.json`;
  }

  const file = Bun.file(path);
  if (!(await file.exists())) return [];

  const data: RpcFile = await file.json();
  return selectEndpoints(data);
}

export async function getNetworkInfo(networkId: NetworkId): Promise<Network | null> {
  if (!networksCache) {
    const file = Bun.file(`${METADATA_BASE}/networks.json`);
    networksCache = await file.json();
  }

  if (isBitcoinNetwork(networkId)) {
    return networksCache!.networks.find((n) => n.networkId === String(networkId)) ?? null;
  }
  return networksCache!.networks.find((n) => n.chainId === networkId) ?? null;
}
