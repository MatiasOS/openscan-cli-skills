import { ClientFactory, type SupportedChainId, type SupportedNetwork } from "@openscan/network-connectors";
import type { Strategy, NetworkId } from "./config";

export class OpenScanClient {
  private clients = new Map<string, any>();

  constructor(
    private config: {
      rpcUrls: Record<string, string[]>;
      strategy: Strategy;
    },
  ) {}

  getClient(networkId: NetworkId) {
    const key = String(networkId);
    const existing = this.clients.get(key);
    if (existing) return existing;

    const rpcUrls = this.config.rpcUrls[key];
    if (!rpcUrls?.length) {
      throw new Error(`No RPC URLs configured for network ${networkId}`);
    }

    const client = ClientFactory.createTypedClient(networkId as SupportedNetwork, {
      rpcUrls,
      type: this.config.strategy,
    });
    this.clients.set(key, client);
    return client;
  }
}
