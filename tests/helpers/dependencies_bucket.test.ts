// import { DependencyGraph } from "@odoo/o-spreadsheet-engine/plugins/ui_core_views/cell_evaluation/dependencies_buckets";
// import { toCartesian, toZone } from "../../src/helpers";

// describe("DependencyGraph", () => {
//   let graph: DependencyGraph;

//   beforeEach(() => {
//     graph = new DependencyGraph();
//   });

//   test("registers a dependency and retrieves it", () => {
//     const zone = toZone("A1:B100");
//     const pos = toCartesian("C5");
//     graph.addDependency(pos, zone);
//     const dependents = graph.getRangeDependents(zone);
//     expect(dependents).toEqual([toZone("C5")]);
//   });

//   test("deduplicates dependency groups for same zone", () => {
//     const zone = toZone("A1:B100");
//     const pos1 = toCartesian("C5");
//     const pos2 = toCartesian("D10");
//     graph.addDependency(pos1, zone);
//     graph.addDependency(pos2, zone);
//     const dependents = graph.getRangeDependents(zone);
//     expect(dependents).toEqual([toZone("C5"), toZone("D10")]);
//   });

//   test("handles multiple distinct dependency zones", () => {
//     const zone1 = toZone("A1:B100");
//     const zone2 = toZone("C1:D100");
//     graph.addDependency(toCartesian("E5"), zone1);
//     graph.addDependency(toCartesian("F10"), zone2);
//     const dependents1 = graph.getRangeDependents(zone1);
//     const dependents2 = graph.getRangeDependents(zone2);
//     expect(dependents1).toEqual([toZone("E5")]);
//     expect(dependents2).toEqual([toZone("F10")]);
//   });

//   test("returns empty for non-overlapping zone", () => {
//     const zone = toZone("A1:B100");
//     graph.addDependency(toCartesian("C5"), zone);
//     const unrelatedZone = toZone("Z200:Z300");
//     const dependents = graph.getRangeDependents(unrelatedZone);
//     expect(dependents).toHaveLength(0);
//   });

//   test("handles huge ranges (globalHuge)", () => {
//     // This range should be considered huge
//     const hugeZone = toZone("A1:Z10000");
//     graph.addDependency(toCartesian("B2"), hugeZone);
//     const dependents = graph.getRangeDependents(hugeZone);
//     expect(dependents).toEqual([toZone("B2")]);
//   });

//   test("handles infinite column (globalCols)", () => {
//     // A:A
//     const colZone = { top: 0, left: 0, bottom: 1_000_000, right: 1 };
//     graph.addDependency(toCartesian("A5"), colZone);
//     const dependents = graph.getRangeDependents(colZone);
//     expect(dependents).toEqual([toZone("A5")]);
//   });

//   test("handles infinite row (globalRows)", () => {
//     // 1:1
//     const rowZone = { top: 0, left: 0, bottom: 1, right: 16_384 };
//     graph.addDependency(toCartesian("B1"), rowZone);
//     const dependents = graph.getRangeDependents(rowZone);
//     expect(dependents).toEqual([toZone("B1")]);
//   });
// });
