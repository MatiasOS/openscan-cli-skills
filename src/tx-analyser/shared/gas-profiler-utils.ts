import type { CallNode, ContractInfo } from "../types/domain";
import type { BreakdownEntry, FlameNode } from "../types/entries";
import { hexToGas } from "./call-tree-utils";
import { decodeFunctionCall } from "./input-decoder";
import { CALL_TYPE_COLORS } from "./call-type-colors";

export function getFlameColor(node: CallNode): string {
  if (node.error) return "#ef4444";
  const typeColor = CALL_TYPE_COLORS[node.type.toUpperCase()];
  if (typeColor) return typeColor;

  const addr = node.to ?? node.from ?? "";
  let h = 0;
  for (let i = 0; i < addr.length; i++) {
    h = (h * 31 + addr.charCodeAt(i)) & 0xffffff;
  }
  return `hsl(${h % 360}, 55%, 50%)`;
}

export function getFlameLabel(node: CallNode, contracts: Record<string, ContractInfo>): string {
  const contractInfo = node.to ? contracts[node.to.toLowerCase()] : undefined;
  const target = contractInfo?.name ?? (node.to ? `${node.to.slice(0, 10)}…` : node.type);

  if (node.input && node.input.length >= 10 && node.input !== "0x" && contractInfo?.abi) {
    const decoded = decodeFunctionCall(node.input, contractInfo.abi);
    if (decoded) return `${target}.${decoded.functionName}()`;
  }

  if (node.input && node.input.length >= 10 && node.input !== "0x") {
    return `${target}.${node.input.slice(0, 10)}()`;
  }

  if (node.type === "CREATE" || node.type === "CREATE2") return `${target} [${node.type}]`;
  return `${target} [${node.type}]`;
}

export function getChildBreakdown(
  node: CallNode,
  parentGas: number,
  contracts: Record<string, ContractInfo>,
): BreakdownEntry[] {
  if (!node.calls?.length) return [];

  const entries: BreakdownEntry[] = node.calls.map((child) => {
    const gas = hexToGas(child.gasUsed) ?? 0;
    return {
      label: getFlameLabel(child, contracts),
      gas,
      pct: parentGas > 0 ? (gas / parentGas) * 100 : 0,
      color: getFlameColor(child),
      type: child.type,
      to: child.to,
    };
  });

  const childSum = entries.reduce((s, e) => s + e.gas, 0);
  const selfGas = parentGas - childSum;

  if (selfGas > 0 && parentGas > 0) {
    entries.unshift({
      label: "self",
      gas: selfGas,
      pct: (selfGas / parentGas) * 100,
      color: "#9ca3af",
      type: "self",
    });
  }

  return entries.sort((a, b) => b.gas - a.gas);
}

export function getNodeByPath(root: CallNode, path: number[]): CallNode | null {
  let current: CallNode | undefined = root;
  for (const index of path) {
    if (!current?.calls || index < 0 || index >= current.calls.length) return null;
    current = current.calls[index];
  }
  return current ?? null;
}

export function buildFlameTree(
  node: CallNode,
  totalGas: number,
  contracts: Record<string, ContractInfo>,
  minWidthPct = 0.3,
): FlameNode {
  const gas = hexToGas(node.gasUsed) ?? 0;
  const widthPct = totalGas > 0 ? (gas / totalGas) * 100 : 0;

  const childNodes = (node.calls ?? [])
    .map((child) => buildFlameTree(child, totalGas, contracts, minWidthPct))
    .filter((child) => child.widthPct >= minWidthPct);

  return {
    label: getFlameLabel(node, contracts),
    gas,
    widthPct,
    color: getFlameColor(node),
    type: node.type,
    to: node.to,
    error: node.error,
    children: childNodes,
  };
}
