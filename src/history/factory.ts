import { transformAll } from "../collaborative/ot/ot";
import { Revision } from "../collaborative/revisions";
import { inverseCommand } from "../helpers/inverse_commands";
import { createEmptyStructure } from "../helpers/state_manager_helpers";
import { StateObserver } from "../state_observer";
import { CoreCommand, HistoryChange, UID } from "../types";
import { SelectiveHistory } from "./selective_history";

export function buildRevisionLog(
  initialRevisionId: UID,
  recordChanges: StateObserver["recordChanges"],
  dispatch: (command: CoreCommand) => void
) {
  return new SelectiveHistory<Revision>(
    initialRevisionId,
    (revision: Revision) => {
      const commands = revision.commands.slice();
      const { changes } = recordChanges(() => {
        for (const command of commands) {
          dispatch(command);
        }
      });
      revision.setChanges(changes);
    },
    (revision: Revision) => revertChanges([revision]),
    (id: UID) => new Revision(id, "empty", [], []),
    {
      with: (revision: Revision) => (toTransform: Revision) => {
        return new Revision(
          toTransform.id,
          toTransform.clientId,
          transformAll(toTransform.commands, revision.commands)
        );
      },
      without: (revision: Revision) => (toTransform: Revision) => {
        return new Revision(
          toTransform.id,
          toTransform.clientId,
          transformAll(toTransform.commands, revision.commands.map(inverseCommand).flat())
        );
      },
    }
  );
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
  let val = change.root as any;
  let key = change.path[change.path.length - 1];
  for (let pathIndex = 0; pathIndex < change.path.slice(0, -1).length; pathIndex++) {
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
