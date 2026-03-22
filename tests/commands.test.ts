import { test, expect, describe } from "bun:test";
import { resolveRpcUrls } from "../src/config";
import { OpenScanClient } from "../src/client";
import { getNetworkStats } from "../src/commands/getNetworkStats";
import { debugTransaction } from "../src/commands/debugTransaction";

describe("getNetworkStats", () => {
  test("fetches Ethereum mainnet stats", async () => {
    const chainId = 1;
    const rpcUrls = await resolveRpcUrls(chainId);
    const client = new OpenScanClient({
      rpcUrls: { [chainId]: rpcUrls },
      strategy: "fallback",
    });

    const result = await getNetworkStats(client, chainId);

    expect(result.chainId).toBe(1);
    expect(result.networkName).toBe("Ethereum Mainnet");
    expect(result.currency).toBe("ETH");
    expect(result.blockNumber).toBeGreaterThan(0);
    expect(Number(result.gasPrice)).toBeGreaterThan(0);
    expect(result.gasPriceGwei).toBeTruthy();
    expect(result.clientVersion).toBeTruthy();
    expect(result.latestBlocks.length).toBeGreaterThan(0);
    expect(result.latestBlocks[0].number).toBeGreaterThan(0);
    expect(result.latestBlocks[0].hash).toMatch(/^0x/);
    expect(result.latestBlocks[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.explorerLink).toBe("https://openscan.eth.link/#/1");
  }, 30000);

  test("fetches Sepolia testnet stats", async () => {
    const chainId = 11155111;
    const rpcUrls = await resolveRpcUrls(chainId);
    const client = new OpenScanClient({
      rpcUrls: { [chainId]: rpcUrls },
      strategy: "fallback",
    });

    const result = await getNetworkStats(client, chainId);

    expect(result.chainId).toBe(11155111);
    expect(result.blockNumber).toBeGreaterThan(0);
    expect(Number(result.gasPrice)).toBeGreaterThan(0);
  }, 30000);
});

describe("debugTransaction", () => {
  test("rejects non-Hardhat chain", async () => {
    const chainId = 1;
    const rpcUrls = await resolveRpcUrls(chainId);
    const client = new OpenScanClient({
      rpcUrls: { [chainId]: rpcUrls },
      strategy: "fallback",
    });

    expect(
      debugTransaction(client, chainId, "0x" + "a".repeat(64)),
    ).rejects.toThrow("debug-tx is only available for Hardhat");
  });

  test("rejects invalid tx hash format", async () => {
    const chainId = 31337;
    const client = new OpenScanClient({
      rpcUrls: { [chainId]: ["http://localhost:8545"] },
      strategy: "fallback",
    });

    expect(
      debugTransaction(client, chainId, "invalid"),
    ).rejects.toThrow("Invalid transaction hash");
  });

  test("rejects short tx hash", async () => {
    const chainId = 31337;
    const client = new OpenScanClient({
      rpcUrls: { [chainId]: ["http://localhost:8545"] },
      strategy: "fallback",
    });

    expect(
      debugTransaction(client, chainId, "0xabc"),
    ).rejects.toThrow("Invalid transaction hash");
  });
});
