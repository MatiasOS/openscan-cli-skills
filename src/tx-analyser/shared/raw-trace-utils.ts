import type { TraceLog, TraceResult } from "../types/domain";
import type { RawTraceEntryOutput, RawTraceRow } from "../types/entries";

export const DEFAULT_OPCODES_PER_PAGE = 200;

export const OPCODE_COLORS: Record<string, string> = {
  CALL: "#3b82f6",
  STATICCALL: "#8b5cf6",
  DELEGATECALL: "#f97316",
  CREATE: "#10b981",
  CREATE2: "#10b981",
  RETURN: "#6b7280",
  REVERT: "#ef4444",
  STOP: "#6b7280",
  SSTORE: "#eab308",
  SLOAD: "#06b6d4",
  LOG0: "#a855f7",
  LOG1: "#a855f7",
  LOG2: "#a855f7",
  LOG3: "#a855f7",
  LOG4: "#a855f7",
};

export function getOpcodeColor(op: string): string | undefined {
  return OPCODE_COLORS[op];
}

function normalizePage(page: number | undefined, totalPages: number): number {
  if (!Number.isFinite(page)) return 0;
  const safePage = Math.max(0, Math.floor(page ?? 0));
  return Math.min(safePage, Math.max(totalPages - 1, 0));
}

function mapLogToRow(log: TraceLog, step: number, expanded: Set<number>): RawTraceRow {
  const isExpanded = expanded.has(step);
  return {
    step,
    pc: log.pc,
    op: log.op,
    gas: log.gas,
    gasCost: log.gasCost,
    depth: log.depth,
    color: getOpcodeColor(log.op),
    isExpanded,
    stack: isExpanded && log.stack?.length ? [...log.stack].reverse() : undefined,
    storage: isExpanded && log.storage && Object.keys(log.storage).length ? log.storage : undefined,
  };
}

export function buildRawTracePage(
  trace: TraceResult,
  page?: number,
  opcodesPerPage = DEFAULT_OPCODES_PER_PAGE,
  expandedSteps: number[] = [],
): RawTraceEntryOutput {
  const steps = trace.structLogs.length;
  const perPage = Math.max(1, Math.floor(opcodesPerPage));
  const totalPages = Math.max(1, Math.ceil(steps / perPage));
  const currentPage = normalizePage(page, totalPages);
  const startIndex = currentPage * perPage;
  const endExclusive = Math.min(startIndex + perPage, steps);
  const expanded = new Set(expandedSteps);

  const rows = trace.structLogs
    .slice(startIndex, endExclusive)
    .map((log, index) => mapLogToRow(log, startIndex + index, expanded));

  return {
    summary: {
      steps,
      gas: trace.gas,
      failed: trace.failed,
    },
    pagination: {
      page: currentPage,
      totalPages,
      fromStep: steps === 0 ? 0 : startIndex + 1,
      toStep: endExclusive,
      opcodesPerPage: perPage,
    },
    rows,
  };
}
