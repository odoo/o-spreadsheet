import { transformAll } from "../collaborative/ot/ot";
import { Revision } from "../collaborative/revisions";
import { inverseCommand } from "../helpers/inverse_commands";
import { createEmptyStructure } from "../helpers/state_manager_helpers";
import type { StateObserver } from "../state_observer";
import type { CoreCommand, HistoryChange, UID } from "../types";
import { SelectiveHistory } from "./selective_history";

export function buildRevisionLog(args: {
  initialRevisionId: UID;
  recordChanges: StateObserver["recordChanges"];
  dispatch: (command: CoreCommand) => void;
}) {
  return new SelectiveHistory<Revision>({
    initialOperationId: args.initialRevisionId,
    applyOperation: (revision: Revision) => {
      const commands = revision.commands.slice();
      const { changes } = args.recordChanges(() => {
        for (const command of commands) {
          args.dispatch(command);
        }
      });
      revision.setChanges(changes);
    },
    revertOperation: (revision: Revision) => revertChanges([revision]),
    buildEmpty: (id: UID) => new Revision(id, "empty", []),
    buildTransformation: {
      with: (revision: Revision) => (toTransform: Revision) => {
        return new Revision(
          toTransform.id,
          toTransform.clientId,
          transformAll(toTransform.commands, revision.commands),
          toTransform.rootCommand,
          undefined,
          toTransform.timestamp
        );
      },
      without: (revision: Revision) => (toTransform: Revision) => {
        return new Revision(
          toTransform.id,
          toTransform.clientId,
          transformAll(toTransform.commands, revision.commands.map(inverseCommand).flat()),
          toTransform.rootCommand,
          undefined,
          toTransform.timestamp
        );
      },
    },
  });
}

/**
 * Revert changes from the given revisions
 */
function revertChanges(revisions: readonly Revision[]) {
  for (const revision of revisions.slice().reverse()) {
    for (let i = revision.changes.length - 1; i >= 0; i--) {
      const change = revision.changes[i];
      applyChange(change, "before");
    }
  }
}

/**
 * Apply the changes of the given HistoryChange to the state
 */
function applyChange(change: HistoryChange, target: "before" | "after") {
  let val = change.path[0];
  const key = change.path.at(-1);
  for (let pathIndex = 1; pathIndex < change.path.slice(0, -1).length; pathIndex++) {
    const p = change.path[pathIndex];
    if (val[p] === undefined) {
      const nextPath = change.path[pathIndex + 1];
      val[p] = createEmptyStructure(nextPath);
    }
    val = val[p];
  }
  if (change[target] === undefined) {
    delete val[key];
  } else {
    val[key] = change[target];
  }
}
