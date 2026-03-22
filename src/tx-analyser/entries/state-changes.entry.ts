import { collectStateChanges } from "../shared/state-change-utils";
import type { StateChangesEntryInput, StateChangesEntryOutput } from "../types/entries";

export function runStateChangesUseCase(input: StateChangesEntryInput): StateChangesEntryOutput {
  const changes = collectStateChanges(input.trace, input.contracts ?? {});

  return {
    totalChangedAddresses: changes.length,
    changes,
  };
}
