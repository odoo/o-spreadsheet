import { Session } from "../../collaborative/session";
import { MAX_HISTORY_STEPS } from "../../constants";
import { canRepeatRevision, repeatRevision } from "../../history/repeat_commands/repeat_revision";
import { Command, CommandResult, UID } from "../../types";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

/**
 * Local History
 *
 * The local history is responsible of tracking the locally state updates
 * It maintains the local undo and redo stack to allow to undo/redo only local
 * changes
 */
export class HistoryPlugin extends UIPlugin {
  static getters = ["canUndo", "canRedo"] as const;
  /**
   * Ids of the revisions which can be undone
   */
  private undoStack: UID[] = [];

  /**
   * Ids of the revisions which can be redone
   */
  private redoStack: UID[] = [];

  private session: Session;

  constructor(config: UIPluginConfig) {
    super(config);
    this.session = config.session;
    this.session.on("new-local-state-update", this, this.onNewLocalStateUpdate);
    this.session.on("pending-revisions-dropped", this, ({ revisionIds }) => this.drop(revisionIds));
    this.session.on("snapshot", this, () => {
      this.undoStack = [];
      this.redoStack = [];
    });
  }

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "REQUEST_UNDO":
        if (!this.canUndo()) {
          return CommandResult.EmptyUndoStack;
        }
        break;
      case "REQUEST_REDO":
        if (!this.canRedo()) {
          return CommandResult.EmptyRedoStack;
        }
        break;
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "REQUEST_UNDO":
      case "REQUEST_REDO":
        // History changes (undo & redo) are *not* applied optimistically on the local state.
        // We wait a global confirmation from the server. The goal is to avoid handling concurrent
        // history changes on multiple clients which are very hard to manage correctly.
        this.requestHistoryChange(cmd.type === "REQUEST_UNDO" ? "UNDO" : "REDO");
    }
  }

  finalize() {}

  private requestHistoryChange(type: "UNDO" | "REDO") {
    const id = type === "UNDO" ? this.undoStack.pop() : this.redoStack.pop();
    if (!id) {
      const lastNonRedoRevision = this.getPossibleRevisionToRepeat();
      if (!lastNonRedoRevision) {
        return;
      }

      const repeatedCommands = repeatRevision(lastNonRedoRevision, this.getters);
      if (!repeatedCommands) {
        return;
      }

      if (!Array.isArray(repeatedCommands)) {
        this.dispatch(repeatedCommands.type, repeatedCommands);
        return;
      }

      for (const command of repeatedCommands) {
        this.dispatch(command.type, command);
      }
      return;
    }
    if (type === "UNDO") {
      this.session.undo(id);
      this.redoStack.push(id);
    } else {
      this.session.redo(id);
      this.undoStack.push(id);
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    if (this.redoStack.length > 0) return true;
    const lastNonRedoRevision = this.getPossibleRevisionToRepeat();
    return canRepeatRevision(lastNonRedoRevision);
  }

  private drop(revisionIds: UID[]) {
    this.undoStack = this.undoStack.filter((id) => !revisionIds.includes(id));
    this.redoStack = [];
  }

  private onNewLocalStateUpdate({ id }: { id: UID }) {
    this.undoStack.push(id);
    this.redoStack = [];
    if (this.undoStack.length > MAX_HISTORY_STEPS) {
      this.undoStack.shift();
    }
  }

  /**
   * Fetch the last revision which is not empty and not a repeated command
   *
   * Ignore repeated commands (REQUEST_REDO command as root command)
   * Ignore standard undo/redo revisions (that are empty)
   */
  private getPossibleRevisionToRepeat() {
    return this.session.getLastLocalNonEmptyRevision();
  }
}
