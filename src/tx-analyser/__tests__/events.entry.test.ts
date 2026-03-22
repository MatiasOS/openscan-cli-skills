import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sampleLogs from "../fixtures/sample-logs.json";
import { runEventsUseCase } from "../entries/events.entry";
import type { EthLog } from "../types/domain";

const transferEventAbi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
];

describe("runEventsUseCase", () => {
  it("prefers enriched ABI decode before recipient ABI and fallback", () => {
    const logs = sampleLogs as EthLog[];

    const output = runEventsUseCase({
      logs,
      txToAddress: logs[0]?.address,
      contractAbi: transferEventAbi,
      contracts: {
        [(logs[0]?.address ?? "").toLowerCase()]: { name: "Token", abi: transferEventAbi },
      },
    });

    expect(output.total).toBe(2);
    expect(output.logs[0]?.decodeSource).toBe("enrichedAbi");
    expect(output.logs[0]?.decoded?.name).toBe("Transfer");
    expect(output.logs[1]?.decodeSource).toBe("raw");
  });

  it("uses tx recipient ABI when enriched ABI is absent", () => {
    const logs = sampleLogs as EthLog[];

    const output = runEventsUseCase({
      logs,
      txToAddress: logs[0]?.address,
      contractAbi: transferEventAbi,
      contracts: {},
    });

    expect(output.logs[0]?.decodeSource).toBe("txRecipientAbi");
    expect(output.logs[0]?.decoded?.name).toBe("Transfer");
  });

  it("falls back to signature DB when ABI decode is unavailable", () => {
    const logs = sampleLogs as EthLog[];

    const output = runEventsUseCase({
      logs,
      contracts: {},
    });

    expect(output.logs[0]?.decodeSource).toBe("signatureDb");
    expect(output.logs[0]?.decoded?.name).toBe("Transfer");
    expect(output.logs[1]?.decodeSource).toBe("raw");
    expect(output.logs[1]?.decoded).toBeNull();
  });
});

describe("entry isolation guard", () => {
  it("entry files do not import non-debug feature paths", () => {
    const files = [
      "events.entry.ts",
      "input-data.entry.ts",
      "call-tree.entry.ts",
      "gas-profiler.entry.ts",
      "state-changes.entry.ts",
      "raw-trace.entry.ts",
    ];

    for (const file of files) {
      const fullPath = join(process.cwd(), "src/debug/tx-analyser/entries", file);
      const content = readFileSync(fullPath, "utf8");

      expect(content).not.toMatch(/src\/components|src\/hooks|src\/services|src\/utils/);

      const imports = [...content.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
      for (const importPath of imports) {
        expect(
          importPath?.startsWith("../shared") ||
            importPath?.startsWith("../types") ||
            importPath?.startsWith("./"),
        ).toBe(true);
      }
    }
  });
});
