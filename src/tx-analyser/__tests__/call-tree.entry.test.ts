import { describe, expect, it } from "vitest";
import sampleCallTree from "../fixtures/sample-call-tree.json";
import { runCallTreeUseCase } from "../entries/call-tree.entry";
import type { CallNode } from "../types/domain";

const transferFnAbi = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
];

describe("runCallTreeUseCase", () => {
  it("returns summary metrics and annotates nodes", () => {
    const root = sampleCallTree as CallNode;

    const output = runCallTreeUseCase({
      root,
      contracts: {
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb": {
          name: "Token",
          abi: transferFnAbi,
        },
      },
    });

    expect(output.summary.totalCalls).toBe(3);
    expect(output.summary.totalReverts).toBe(1);
    expect(output.summary.gasUsed).toBe(100000);
    expect(output.summary.typeCounts.CALL).toBe(1);
    expect(output.root.contractName).toBe("Token");
    expect(output.root.decodedCall?.functionName).toBe("transfer");
  });

  it("handles missing ABI without crashing", () => {
    const root = sampleCallTree as CallNode;
    const output = runCallTreeUseCase({ root, contracts: {} });

    expect(output.root.decodedCall).toBeNull();
    expect(output.root.calls?.length).toBe(2);
  });
});
