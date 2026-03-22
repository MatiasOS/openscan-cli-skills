import { describe, expect, it } from "vitest";
import sampleCallTree from "../fixtures/sample-call-tree.json";
import { runGasProfilerUseCase } from "../entries/gas-profiler.entry";
import type { CallNode } from "../types/domain";

describe("runGasProfilerUseCase", () => {
  it("computes flame percentages in zoom scope", () => {
    const root = sampleCallTree as CallNode;
    const output = runGasProfilerUseCase({ root, contracts: {} });

    expect(output.totalGas).toBe(100000);
    expect(output.zoomGas).toBe(100000);
    expect(output.flame.widthPct).toBeCloseTo(100, 5);

    const childWidthSum = output.flame.children.reduce((sum, child) => sum + child.widthPct, 0);
    expect(childWidthSum).toBeGreaterThan(0);
    expect(childWidthSum).toBeLessThanOrEqual(100);
  });

  it("computes self gas and handles selected leaf node breakdown", () => {
    const root = sampleCallTree as CallNode;

    const rootSelection = runGasProfilerUseCase({ root, contracts: {}, selectedPath: [] });
    expect(rootSelection.selection).not.toBeNull();
    const selfEntry = rootSelection.selection?.breakdown.find((entry) => entry.type === "self");
    expect(selfEntry).toBeDefined();
    expect((selfEntry?.gas ?? 0) > 0).toBe(true);

    const leafSelection = runGasProfilerUseCase({ root, contracts: {}, selectedPath: [1] });
    expect(leafSelection.isZoomed).toBe(true);
    expect(leafSelection.selection?.breakdown).toEqual([]);
  });
});
