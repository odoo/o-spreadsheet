import { ConflictResolver } from "../../src/helpers/conflict_resolver";

describe("Conflict Resolver", () => {
  test("don't change a basic update", () => {
    const stateVector = { "1": 1 };
    const updates = [
      {
        path: ["A", "B", "C"],
        value: "value",
      },
    ];
    const conflictResolver = new ConflictResolver();
    expect(conflictResolver.resolveConflicts(stateVector, updates)).toEqual(updates);
  });

  test("receive concurrent and conflicting update", () => {
    const stateVector1 = { A: 1 };
    const updates1 = [
      {
        path: ["A", "B", "C"],
        value: "value",
      },
    ];
    const stateVector2 = { B: 1 };
    const updates2 = [
      {
        path: ["A", "B", "C"],
        value: "value",
      },
    ];
    const conflictResolver = new ConflictResolver();
    conflictResolver.addUpdateToHistory(stateVector1, updates1);
    expect(conflictResolver.resolveConflicts(stateVector2, updates2)).toEqual([]);
  });

  test("receive conflicting but not concurrent update", () => {
    const stateVector1 = { A: 1 };
    const updates1 = [
      {
        path: ["A", "B", "C"],
        value: "value",
      },
    ];
    const stateVector2 = { B: 2, A: 1 };
    const updates2 = [
      {
        path: ["A", "B", "C"],
        value: "value",
      },
    ];
    const conflictResolver = new ConflictResolver();
    conflictResolver.addUpdateToHistory(stateVector1, updates1);
    expect(conflictResolver.resolveConflicts(stateVector2, updates2)).toEqual(updates2);
  });

  test("concurrent messages with one state already incremented", () => {
    const stateVector1 = { A: 1 };
    const updates1 = [
      {
        path: ["A", "B", "C"],
        value: "value1",
      },
    ];
    const stateVector2 = { B: 2 };
    const updates2 = [
      {
        path: ["A", "B", "C"],
        value: "value2",
      },
    ];
    const conflictResolver = new ConflictResolver();
    conflictResolver.addUpdateToHistory(stateVector1, updates1);
    expect(conflictResolver.resolveConflicts(stateVector2, updates2)).toHaveLength(0);
  });

  test("receive concurrent but not conflicting update", () => {
    const stateVector1 = { A: 1 };
    const updates1 = [
      {
        path: ["B", "C"],
        value: "value",
      },
    ];
    const stateVector2 = { B: 1 };
    const updates2 = [
      {
        path: ["A", "D"],
        value: "value",
      },
    ];
    const conflictResolver = new ConflictResolver();
    conflictResolver.addUpdateToHistory(stateVector1, updates1);
    expect(conflictResolver.resolveConflicts(stateVector2, updates2)).toEqual(updates2);
  });

  test("receive concurrent and conflicting and not conflicting updates", () => {
    const stateVector1 = { A: 1 };
    const updates1 = [
      {
        path: ["A", "B", "C"],
        value: "value",
      },
    ];
    const stateVector2 = { B: 1 };
    const updates2 = [
      {
        path: ["A", "B", "C"],
        value: "value",
      },
      {
        path: ["A", "B", "D"],
        value: "value",
      },
    ];
    const conflictResolver = new ConflictResolver();
    conflictResolver.addUpdateToHistory(stateVector1, updates1);
    expect(conflictResolver.resolveConflicts(stateVector2, updates2)).toEqual([updates2[1]]);
  });

  test("receive concurrent updates, first included in second", () => {
    const stateVector1 = { A: 1 };
    const updates1 = [
      {
        path: ["A", "B", "C"],
        value: "value",
      },
    ];
    const stateVector2 = { B: 1 };
    const updates2 = [
      {
        path: ["A", "B"],
        value: {
          C: "value1",
          D: "value2",
        },
      },
    ];
    const conflictResolver = new ConflictResolver();
    conflictResolver.addUpdateToHistory(stateVector1, updates1);
    expect(conflictResolver.resolveConflicts(stateVector2, updates2)).toEqual([
      {
        path: ["A", "B"],
        value: {
          D: "value2",
        },
      },
    ]);
  });

  test("receive concurrent updates, first included in second, two nesting level", () => {
    const stateVector1 = { A: 1 };
    const updates1 = [
      {
        path: ["A", "B", "C", "D"],
        value: "value",
      },
    ];
    const stateVector2 = { B: 1 };
    const updates2 = [
      {
        path: ["A", "B"],
        value: {
          C: {
            D: "value1",
            E: "value2",
          },
        },
      },
    ];
    const conflictResolver = new ConflictResolver();
    conflictResolver.addUpdateToHistory(stateVector1, updates1);
    expect(conflictResolver.resolveConflicts(stateVector2, updates2)).toEqual([
      {
        path: ["A", "B"],
        value: {
          C: {
            E: "value2",
          },
        },
      },
    ]);
  });

  test("receive concurrent updates, second included in first", () => {
    const stateVector1 = { A: 1 };
    const updates1 = [
      {
        path: ["A", "B"],
        value: {
          C: "value1",
          D: "value2",
        },
      },
    ];
    const stateVector2 = { B: 1 };
    const updates2 = [
      {
        path: ["A", "B", "C"],
        value: "value",
      },
    ];
    const conflictResolver = new ConflictResolver();
    conflictResolver.addUpdateToHistory(stateVector1, updates1);
    expect(conflictResolver.resolveConflicts(stateVector2, updates2)).toEqual([]);
  });

  test("state vectors are immutable in the history", () => {
    const stateVector = { "1": 1 };
    const updates = [{ path: ["A"], value: 1 }];
    const conflictResolver = new ConflictResolver();
    conflictResolver.addUpdateToHistory(stateVector, updates);
    stateVector["1"]++; // this should not have modified the state vector saved in the history
    expect(conflictResolver.resolveConflicts(stateVector, updates)).toEqual(updates);
  });
});
