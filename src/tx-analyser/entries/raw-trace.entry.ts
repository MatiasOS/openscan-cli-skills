import { buildRawTracePage } from "../shared/raw-trace-utils";
import type { RawTraceEntryInput, RawTraceEntryOutput } from "../types/entries";

export function runRawTraceUseCase(input: RawTraceEntryInput): RawTraceEntryOutput {
  return buildRawTracePage(
    input.trace,
    input.page,
    input.opcodesPerPage,
    input.expandedSteps ?? [],
  );
}
