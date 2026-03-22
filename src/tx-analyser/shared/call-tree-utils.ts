import type { CallNode } from "../types/domain";

export function normalizeGethCallTrace(raw: unknown): CallNode {
  const node = (raw ?? {}) as Record<string, unknown>;
  return {
    type: String(node.type ?? "CALL").toUpperCase(),
    from: typeof node.from === "string" ? node.from : "",
    to: typeof node.to === "string" ? node.to : undefined,
    value: typeof node.value === "string" ? node.value : undefined,
    gas: typeof node.gas === "string" ? node.gas : undefined,
    gasUsed: typeof node.gasUsed === "string" ? node.gasUsed : undefined,
    input: typeof node.input === "string" ? node.input : undefined,
    output: typeof node.output === "string" ? node.output : undefined,
    error: typeof node.error === "string" ? node.error : undefined,
    revertReason: typeof node.revertReason === "string" ? node.revertReason : undefined,
    calls: Array.isArray(node.calls) ? node.calls.map((c) => normalizeGethCallTrace(c)) : undefined,
  };
}

interface ParityTraceAction {
  callType?: string;
  from?: string;
  to?: string;
  value?: string;
  gas?: string;
  input?: string;
}

interface ParityTraceResult {
  gasUsed?: string;
  output?: string;
  address?: string;
}

interface ParityTrace {
  type: string;
  action: ParityTraceAction;
  result?: ParityTraceResult;
  error?: string;
  traceAddress: number[];
  subtraces: number;
}

export function normalizeParityCallTrace(traces: ParityTrace[]): CallNode | null {
  if (!traces || traces.length === 0) return null;

  const root = traces.find((t) => t.traceAddress.length === 0);
  if (!root) return null;

  function buildNode(trace: ParityTrace): CallNode {
    const action = trace.action;
    const result = trace.result;

    const children = traces
      .filter((t) => {
        if (t.traceAddress.length !== trace.traceAddress.length + 1) return false;
        return trace.traceAddress.every((v, i) => t.traceAddress[i] === v);
      })
      .map(buildNode);

    return {
      type: (action.callType || trace.type || "CALL").toUpperCase(),
      from: action.from ?? "",
      to: action.to ?? result?.address,
      value: action.value,
      gas: action.gas,
      gasUsed: result?.gasUsed,
      input: action.input,
      output: result?.output,
      error: trace.error,
      calls: children.length > 0 ? children : undefined,
    };
  }

  return buildNode(root);
}

export function countCalls(node: CallNode): number {
  return 1 + (node.calls?.reduce((sum, c) => sum + countCalls(c), 0) ?? 0);
}

export function countReverts(node: CallNode): number {
  const selfReverted = node.error ? 1 : 0;
  return selfReverted + (node.calls?.reduce((sum, c) => sum + countReverts(c), 0) ?? 0);
}

export function countByType(node: CallNode): Record<string, number> {
  const counts: Record<string, number> = {};
  function traverse(n: CallNode) {
    const type = n.type.toUpperCase();
    counts[type] = (counts[type] ?? 0) + 1;
    n.calls?.forEach(traverse);
  }
  traverse(node);
  return counts;
}

export function collectAddresses(node: CallNode): string[] {
  const addrs = new Set<string>();
  function traverse(n: CallNode) {
    if (n.from) addrs.add(n.from.toLowerCase());
    if (n.to) addrs.add(n.to.toLowerCase());
    n.calls?.forEach(traverse);
  }
  traverse(node);
  return Array.from(addrs);
}

export function hexToGas(hex: string | undefined): number | undefined {
  if (!hex) return undefined;
  const normalized = hex.startsWith("0x") ? hex : `0x${hex}`;
  const parsed = Number.parseInt(normalized, 16);
  return Number.isNaN(parsed) ? undefined : parsed;
}
