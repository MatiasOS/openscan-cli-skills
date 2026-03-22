import { decodeFunctionCall, tryDecodeUtf8 } from "../shared/input-decoder";
import type { InputDataEntryInput, InputDataEntryOutput } from "../types/entries";

export function runInputDataUseCase(input: InputDataEntryInput): InputDataEntryOutput {
  const rawInputData = input.inputData || "0x";

  if (input.decodedInput) {
    return {
      rawInputData,
      decodedCall: input.decodedInput,
      decodeSource: "provided",
      utf8Text: null,
    };
  }

  const contracts = input.contracts ?? {};
  let decodedCall = null;

  if (input.txToAddress && rawInputData && rawInputData !== "0x") {
    const enriched = contracts[input.txToAddress.toLowerCase()];
    if (enriched?.abi) {
      decodedCall = decodeFunctionCall(rawInputData, enriched.abi);
    }
  }

  if (decodedCall) {
    return {
      rawInputData,
      decodedCall,
      decodeSource: "enrichedAbi",
      utf8Text: null,
    };
  }

  return {
    rawInputData,
    decodedCall: null,
    decodeSource: "none",
    utf8Text: tryDecodeUtf8(rawInputData),
  };
}
