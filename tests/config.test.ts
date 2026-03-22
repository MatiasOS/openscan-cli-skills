import { test, expect, describe } from "bun:test";
import { resolveChainId, resolveStrategy, isBitcoinNetwork } from "../src/config";
import { decodeRevertReason } from "../src/formatter";
import { BITCOIN_MAINNET, BITCOIN_TESTNET4 } from "@openscan/network-connectors";

describe("resolveChainId", () => {
  test("resolves common aliases", () => {
    expect(resolveChainId("ethereum")).toBe(1);
    expect(resolveChainId("eth")).toBe(1);
    expect(resolveChainId("mainnet")).toBe(1);
    expect(resolveChainId("base")).toBe(8453);
    expect(resolveChainId("arbitrum")).toBe(42161);
    expect(resolveChainId("arb")).toBe(42161);
    expect(resolveChainId("polygon")).toBe(137);
    expect(resolveChainId("matic")).toBe(137);
    expect(resolveChainId("optimism")).toBe(10);
    expect(resolveChainId("op")).toBe(10);
    expect(resolveChainId("bnb")).toBe(56);
    expect(resolveChainId("bsc")).toBe(56);
    expect(resolveChainId("avalanche")).toBe(43114);
    expect(resolveChainId("avax")).toBe(43114);
    expect(resolveChainId("sepolia")).toBe(11155111);
    expect(resolveChainId("bsctestnet")).toBe(97);
    expect(resolveChainId("bnbtestnet")).toBe(97);
    expect(resolveChainId("hardhat")).toBe(31337);
    expect(resolveChainId("localhost")).toBe(31337);
    expect(resolveChainId("aztec")).toBe(677868);
  });

  test("resolves bitcoin aliases", () => {
    expect(resolveChainId("bitcoin")).toBe(BITCOIN_MAINNET);
    expect(resolveChainId("btc")).toBe(BITCOIN_MAINNET);
    expect(resolveChainId("btc-testnet")).toBe(BITCOIN_TESTNET4);
    expect(resolveChainId("bitcoin-testnet")).toBe(BITCOIN_TESTNET4);
    expect(resolveChainId("btctestnet")).toBe(BITCOIN_TESTNET4);
  });

  test("resolves raw bip122 IDs", () => {
    expect(resolveChainId(BITCOIN_MAINNET)).toBe(BITCOIN_MAINNET);
    expect(resolveChainId(BITCOIN_TESTNET4)).toBe(BITCOIN_TESTNET4);
  });

  test("resolves numeric chain IDs", () => {
    expect(resolveChainId("1")).toBe(1);
    expect(resolveChainId("42161")).toBe(42161);
    expect(resolveChainId("8453")).toBe(8453);
  });

  test("is case-insensitive", () => {
    expect(resolveChainId("Ethereum")).toBe(1);
    expect(resolveChainId("BASE")).toBe(8453);
    expect(resolveChainId("Arbitrum")).toBe(42161);
    expect(resolveChainId("Bitcoin")).toBe(BITCOIN_MAINNET);
    expect(resolveChainId("BTC")).toBe(BITCOIN_MAINNET);
  });

  test("throws on unknown chain", () => {
    expect(() => resolveChainId("unknown")).toThrow('Unknown chain: "unknown"');
    expect(() => resolveChainId("-1")).toThrow();
    expect(() => resolveChainId("0")).toThrow();
  });
});

describe("isBitcoinNetwork", () => {
  test("identifies bitcoin networks", () => {
    expect(isBitcoinNetwork(BITCOIN_MAINNET)).toBe(true);
    expect(isBitcoinNetwork(BITCOIN_TESTNET4)).toBe(true);
  });

  test("rejects EVM networks", () => {
    expect(isBitcoinNetwork(1)).toBe(false);
    expect(isBitcoinNetwork(8453)).toBe(false);
  });
});

describe("resolveStrategy", () => {
  test("defaults to fallback", () => {
    expect(resolveStrategy()).toBe("fallback");
    expect(resolveStrategy(undefined)).toBe("fallback");
  });

  test("accepts valid strategies", () => {
    expect(resolveStrategy("fallback")).toBe("fallback");
    expect(resolveStrategy("parallel")).toBe("parallel");
    expect(resolveStrategy("race")).toBe("race");
  });

  test("is case-insensitive", () => {
    expect(resolveStrategy("FALLBACK")).toBe("fallback");
    expect(resolveStrategy("Parallel")).toBe("parallel");
  });

  test("throws on invalid strategy", () => {
    expect(() => resolveStrategy("invalid")).toThrow('Unknown strategy: "invalid"');
  });
});

describe("decodeRevertReason", () => {
  test("decodes Error(string)", () => {
    // Error("Insufficient balance")
    const data =
      "0x08c379a2" +
      "0000000000000000000000000000000000000000000000000000000000000020" +
      "0000000000000000000000000000000000000000000000000000000000000014" +
      "496e73756666696369656e742062616c616e6365000000000000000000000000";
    expect(decodeRevertReason(data)).toBe("Insufficient balance");
  });

  test("decodes Panic(uint256) - overflow", () => {
    const data =
      "0x4e487b71" +
      "0000000000000000000000000000000000000000000000000000000000000011";
    expect(decodeRevertReason(data)).toBe("Arithmetic overflow/underflow");
  });

  test("decodes Panic(uint256) - division by zero", () => {
    const data =
      "0x4e487b71" +
      "0000000000000000000000000000000000000000000000000000000000000012";
    expect(decodeRevertReason(data)).toBe("Division or modulo by zero");
  });

  test("returns custom error selector for unknown errors", () => {
    const data = "0xabcdef12" + "0000000000000000000000000000000000000000000000000000000000000001";
    expect(decodeRevertReason(data)).toBe("Custom error: 0xabcdef12");
  });

  test("returns null for empty data", () => {
    expect(decodeRevertReason("")).toBeNull();
    expect(decodeRevertReason("0x")).toBeNull();
  });

  test("returns null for short data", () => {
    expect(decodeRevertReason("0x1234")).toBeNull();
  });
});
