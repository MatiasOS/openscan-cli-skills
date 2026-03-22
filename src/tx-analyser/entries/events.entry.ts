import { decodeEventLog } from "../shared/event-decoder";
import { decodeEventWithAbi } from "../shared/input-decoder";
import type {
  DecodedEvent,
  EventDecodeSource,
  EventsEntryInput,
  EventsEntryOutput,
} from "../types/entries";
import type { DecodedInput } from "../types/domain";

function toDecodedPayload(decoded: DecodedInput | DecodedEvent) {
  if ("fullSignature" in decoded) {
    return {
      name: decoded.name,
      signature: decoded.signature,
      fullSignature: decoded.fullSignature,
      type: decoded.type,
      description: decoded.description,
      params: decoded.params,
    };
  }

  return {
    name: decoded.functionName,
    signature: decoded.signature,
    params: decoded.params,
  };
}

export function runEventsUseCase(input: EventsEntryInput): EventsEntryOutput {
  const logs = input.logs ?? [];
  const contracts = input.contracts ?? {};
  const txToAddress = input.txToAddress?.toLowerCase();

  return {
    total: logs.length,
    logs: logs.map((log, index) => {
      let decodeSource: EventDecodeSource = "raw";
      let decodedPayload: DecodedInput | DecodedEvent | null = null;

      const enrichedContract = log.address ? contracts[log.address.toLowerCase()] : undefined;

      if (enrichedContract?.abi && log.topics?.length) {
        const decoded = decodeEventWithAbi(log.topics, log.data || "0x", enrichedContract.abi);
        if (decoded) {
          decodeSource = "enrichedAbi";
          decodedPayload = decoded;
        }
      }

      if (
        !decodedPayload &&
        txToAddress &&
        log.address?.toLowerCase() === txToAddress &&
        input.contractAbi &&
        log.topics?.length
      ) {
        const decoded = decodeEventWithAbi(log.topics, log.data || "0x", input.contractAbi);
        if (decoded) {
          decodeSource = "txRecipientAbi";
          decodedPayload = decoded;
        }
      }

      if (!decodedPayload && log.topics?.length) {
        const decoded = decodeEventLog(log.topics, log.data || "0x");
        if (decoded) {
          decodeSource = "signatureDb";
          decodedPayload = decoded;
        }
      }

      return {
        index,
        address: log.address,
        topics: log.topics ?? [],
        data: log.data ?? "0x",
        decodeSource,
        decoded: decodedPayload ? toDecodedPayload(decodedPayload) : null,
      };
    }),
  };
}
