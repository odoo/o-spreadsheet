import { HistoryUpdate, StateVector, Update } from "../types/multi_user";

/**
 * This class manages conflicts between concurrent updates.
 * An update is defined by two elements:
 * 1) the path in the JSON state which is updated
 * 2) the value
 * See the type definition of `Update` for a detailed explanation.
 *
 * Three steps are required to ensure consistency between updates:
 * concurrency detection, conflict detection and finally conflict resolution.
 *
 * Concurrency detection
 * =====================
 * We use state vectors[1] (sometime also called vector clocks) to determine the partial
 * ordering[2] of updates.
 * See the type definition of `StateVector` if you need a refresher on state vectors.
 *
 * We can partially order state vectors of each client which allows to detect concurrent updates:
 * V1 and V2 are concurrent if V1 <= V2 and V1 >= V2
 *
 * Conflict detection
 * ==================
 * Two updates are conflicting if:
 * 1) they happened concurrently
 * 2) and they update the same part of the state
 *
 * We can tell if two updates changes the same part of the state by looking at their path :
 * - ["A", "B"] and ["A", "B"] are obviously conflicting
 * - ["A", "B"] and ["A"] are also conflicting
 * - ["A", "B"] and ["A", "C"] are not conflicting
 *
 *
 * Conflict resolution
 * ===================
 * First udpate arrived wins. Conflicting updates which arrive after are dropped.
 * The winning update is transmitted to all other clients, overwritting any concurrent local change.
 * Sometimes, one update might be conflicting with the winning update but have additional values that
 * do not conflict.
 * e.g.
 * winning (first) update: U1 = {
 *    path: ["A", "B"],
 *    value: 2
 * }
 * concurrent update: U2 = {
 *    path: ["A"],
 *    value: {
 *      B: 3,
 *      C: 4
 *    }
 * }
 * Here U1 and U2 only conflict for the path ["A", "B"]. It must be dropped from U2.
 * However, the value for ["A", "C"] must be transmitted to all other clients.
 * The update U2 is transformed to U2' = {
 *    path: ["A"],
 *    value: {
 *      C: 4
 *    }
 * }
 *
 * [1] https://en.wikipedia.org/wiki/Vector_clock
 * [2] https://en.wikipedia.org/wiki/Partially_ordered_set
 */
export class ConflictResolver {
  private updateHistory: HistoryUpdate[] = [];

  resolveConflicts(stateVector: StateVector, updates: Update[]): Update[] {
    return updates
      .map((update) => this.removeConflictingValues(stateVector, update))
      .filter((update: Update | false): update is Update => update !== false);
  }

  addUpdateToHistory(stateVector: StateVector, updates: Update[]) {
    this.updateHistory = this.updateHistory.concat(
      updates.map((update) => ({
        stateVector: { ...stateVector },
        ...update,
      }))
    );
  }

  getUpdateHistory(): { stateVector: StateVector; updates: Update[] } | undefined {
    if (this.updateHistory.length === 0) {
      return;
    }
    return {
      stateVector: this.updateHistory[this.updateHistory.length - 1].stateVector,
      updates: this.updateHistory.map(({ path, value }) => ({ path, value })),
    };
  }

  /**
   * Let denote V1 and V2 the two argument state vectors.
   * Each vector holds
   * This method checks if V1 precedes V2 (meaning happened before): V1 < V2
   * V1 < V2 if and only if:
   * - V1[c] <= V2[c] for all c in
   */
  private precedes(stateVector1: StateVector, stateVector2: StateVector): boolean {
    const clientIds = new Set(Object.keys(stateVector1).concat(Object.keys(stateVector2)));
    let onePrecedes = false;
    for (let clientId of clientIds) {
      const state1 = stateVector1[clientId] || 0;
      const state2 = stateVector2[clientId] || 0;
      if (state1 > state2) return false;
      if (state1 < state2) {
        onePrecedes = true;
      }
    }
    return onePrecedes;
  }

  private isConcurrent(stateVector1: StateVector, stateVector2: StateVector) {
    return !this.precedes(stateVector2, stateVector1) && !this.precedes(stateVector1, stateVector2);
  }

  private transform(executedUpdate: Update, nextUpdate: Update) {
    const executed = {
      length: executedUpdate.path.length,
    };
    const next = {
      length: nextUpdate.path.length,
    };
    for (let index in nextUpdate.path) {
      if (parseInt(index, 10) >= executed.length) {
        return false;
      } else if (executedUpdate.path[index] !== nextUpdate.path[index]) {
        return nextUpdate;
      }
    }
    // A more precise update is already applied
    // => remove precise part of the general next update
    // console.log(`next.length: ${next.length}`);
    // console.log(`executed.length: ${executed.length}`);
    if (next.length < executed.length) {
      // executed:      ["sheetId", "cells", "B1", "content"], "salut"
      // next:  ["sheetId", "cells", "B1"], { content: "salut" }
      const generalValue = nextUpdate.value;
      // console.log(`generalValue: ${JSON.stringify(generalValue)}`);
      // console.log(`executedUpdate.path: ${executedUpdate.path}`);
      const precisePath = executedUpdate.path.slice(next.length);
      // console.log(`precisePath: ${precisePath}`);
      let node = generalValue;
      let [last, ...path] = precisePath.reverse(); // TODO clean me
      for (let a of path.reverse()) {
        // console.log(`node: ${JSON.stringify(node)}; a: ${a}`);
        node = node[a];
      }
      delete node[last];
      return nextUpdate;
    }
    return false;
  }

  private removeConflictingValues(stateVector: StateVector, nextUpdate: Update): Update | false {
    let transformedUpdate: Update | false = nextUpdate;
    this.updateHistory
      .filter((update) => this.isConcurrent(stateVector, update.stateVector))
      .forEach((update) => {
        transformedUpdate = transformedUpdate && this.transform(update, transformedUpdate);
      });
    return transformedUpdate;
  }
}
