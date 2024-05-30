import { transformAll } from "../collaborative/ot/ot";
import { Revision } from "../collaborative/revisions";
import { inverseCommand } from "../helpers/inverse_commands";
import { StateObserver } from "../state_observer";
import { CoreCommand, HistoryChange, UID } from "../types";
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
          toTransform.rootCommands,
          undefined,
          toTransform.timestamp
        );
      },
      without: (revision: Revision) => (toTransform: Revision) => {
        return new Revision(
          toTransform.id,
          toTransform.clientId,
          transformAll(toTransform.commands, revision.commands.map(inverseCommand).flat()),
          toTransform.rootCommands,
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
      applyChange(change);
    }
  }
}

/**
 * Apply the changes of the given HistoryChange to the state
 */
function applyChange(change: HistoryChange) {
  const target = change.target;
  const key = change.key;
  const before = change.before;
  if (before === undefined) {
    delete target[key];
  } else {
    target[key] = before;
  }
}
