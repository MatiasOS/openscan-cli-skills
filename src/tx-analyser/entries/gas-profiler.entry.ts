import { hexToGas } from "../shared/call-tree-utils";
import {
  buildFlameTree,
  getChildBreakdown,
  getFlameLabel,
  getNodeByPath,
} from "../shared/gas-profiler-utils";
import type { GasProfilerEntryInput, GasProfilerEntryOutput } from "../types/entries";

export function runGasProfilerUseCase(input: GasProfilerEntryInput): GasProfilerEntryOutput {
  const contracts = input.contracts ?? {};
  const totalGas = hexToGas(input.root.gasUsed) ?? 1;

  const selectedPath = input.selectedPath ?? [];
  const selectedNode = input.selectedPath ? getNodeByPath(input.root, selectedPath) : null;

  const zoomNode = selectedNode ?? input.root;
  const zoomGas = hexToGas(zoomNode.gasUsed) ?? 1;

  const flame = buildFlameTree(zoomNode, zoomGas, contracts);

  return {
    totalGas,
    zoomGas,
    isZoomed: zoomNode !== input.root,
    flame,
    selection: selectedNode
      ? {
          path: selectedPath,
          label: getFlameLabel(selectedNode, contracts),
          gas: hexToGas(selectedNode.gasUsed) ?? 0,
          breakdown: getChildBreakdown(selectedNode, hexToGas(selectedNode.gasUsed) ?? 1, contracts),
        }
      : null,
  };
}
