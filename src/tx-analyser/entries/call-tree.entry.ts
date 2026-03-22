import { countByType, countCalls, countReverts, hexToGas } from "../shared/call-tree-utils";
import { decodeFunctionCall } from "../shared/input-decoder";
import type { CallNode, ContractInfo } from "../types/domain";
import type { AnnotatedCallNode, CallTreeEntryInput, CallTreeEntryOutput } from "../types/entries";

function annotateNode(node: CallNode, contracts: Record<string, ContractInfo> = {}): AnnotatedCallNode {
  const contractInfo = node.to ? contracts[node.to.toLowerCase()] : undefined;

  return {
    type: node.type,
    from: node.from,
    to: node.to,
    value: node.value,
    gas: node.gas,
    gasUsed: node.gasUsed,
    input: node.input,
    output: node.output,
    error: node.error,
    revertReason: node.revertReason,
    contractName: contractInfo?.name,
    decodedCall:
      node.input && node.input !== "0x" && contractInfo?.abi
        ? decodeFunctionCall(node.input, contractInfo.abi)
        : null,
    calls: node.calls?.map((child) => annotateNode(child, contracts)),
  };
}

export function runCallTreeUseCase(input: CallTreeEntryInput): CallTreeEntryOutput {
  const root = annotateNode(input.root, input.contracts);

  return {
    summary: {
      totalCalls: countCalls(input.root),
      totalReverts: countReverts(input.root),
      gasUsed: hexToGas(input.root.gasUsed),
      typeCounts: countByType(input.root),
    },
    root,
  };
}
