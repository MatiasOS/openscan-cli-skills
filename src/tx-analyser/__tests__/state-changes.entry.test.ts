import { describe, expect, it } from "vitest";
import samplePrestate from "../fixtures/sample-prestate.json";
import { runStateChangesUseCase } from "../entries/state-changes.entry";
import type { PrestateTrace } from "../types/domain";

describe("runStateChangesUseCase", () => {
  it("returns only changed addresses with detailed diffs", () => {
    const trace = samplePrestate as PrestateTrace;
    const output = runStateChangesUseCase({
      trace,
      contracts: {
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa": { name: "Alice" },
      },
    });

    expect(output.totalChangedAddresses).toBe(2);

    const alice = output.changes.find(
      (change) => change.address === "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(alice?.contractName).toBe("Alice");
    expect(alice?.balance?.diff.startsWith("+")).toBe(true);
    expect(alice?.nonce?.diff).toBe(1);
    expect(alice?.storage[0]?.before).toBe("0x10");
    expect(alice?.storage[0]?.after).toBe("0x20");
  });

  it("filters out unchanged addresses", () => {
    const trace: PrestateTrace = {
      pre: {
        "0x111": { balance: "0x1", nonce: 1, storage: { "0x01": "0x01" } },
      },
      post: {
        "0x111": { balance: "0x1", nonce: 1, storage: { "0x01": "0x01" } },
      },
    };

    const output = runStateChangesUseCase({ trace });
    expect(output.totalChangedAddresses).toBe(0);
    expect(output.changes).toEqual([]);
  });
});
