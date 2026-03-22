import { describe, expect, it } from "vitest";
import { runInputDataUseCase } from "../entries/input-data.entry";

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

const transferCallData =
  "0xa9059cbb000000000000000000000000cccccccccccccccccccccccccccccccccccccccc0000000000000000000000000000000000000000000000000000000000000064";

describe("runInputDataUseCase", () => {
  it("uses provided decoded input when present", () => {
    const output = runInputDataUseCase({
      inputData: transferCallData,
      decodedInput: {
        functionName: "transfer",
        signature: "transfer(address,uint256)",
        params: [
          { name: "to", type: "address", value: "0xabc", indexed: false },
          { name: "amount", type: "uint256", value: "100", indexed: false },
        ],
      },
    });

    expect(output.decodeSource).toBe("provided");
    expect(output.decodedCall?.functionName).toBe("transfer");
    expect(output.utf8Text).toBeNull();
  });

  it("falls back to enriched ABI decode", () => {
    const output = runInputDataUseCase({
      inputData: transferCallData,
      txToAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      contracts: {
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb": { abi: transferFnAbi },
      },
    });

    expect(output.decodeSource).toBe("enrichedAbi");
    expect(output.decodedCall?.functionName).toBe("transfer");
    expect(output.rawInputData).toBe(transferCallData);
  });

  it("falls back to UTF-8 decode when ABI decode is unavailable", () => {
    const output = runInputDataUseCase({
      inputData: "0x48656c6c6f2c20646562756721",
    });

    expect(output.decodeSource).toBe("none");
    expect(output.decodedCall).toBeNull();
    expect(output.utf8Text).toContain("Hello");
    expect(output.rawInputData).toBe("0x48656c6c6f2c20646562756721");
  });
});
