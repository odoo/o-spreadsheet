import * as owl from "@odoo/owl";
import { Session } from "../collaborative/session";
import { MAX_HISTORY_STEPS } from "../constants";
import { CancelledReason, Command, CommandDispatcher, CommandResult, UID } from "../types";

/**
 * Local History
 *
 * The local history is responsible of tracking the locally state updates
 * It maintains the local undo and redo stack to allow to undo/redo only local
 * changes
 */
export class LocalHistory extends owl.core.EventBus {
  /**
   * Ids of the revisions which can be undone
   */
  private undoStack: UID[] = [];

  /**
   * Ids of the revisions which can be redone
   */
  private redoStack: UID[] = [];

  /**
   * Flag used to block all commands when an undo or redo is triggered, until
   * it is accepted on the server
   */
  private shouldCancelAllCommands: boolean = false;

  constructor(protected dispatch: CommandDispatcher["dispatch"], private session: Session) {
    super();
    this.session.on("new-local-state-update", this, this.onNewLocalStateUpdate);
    this.session.on("revision-undone", this, this.selectiveUndo);
    this.session.on("revision-redone", this, this.selectiveRedo);
  }

  allowDispatch(cmd: Command): CommandResult {
    if (this.shouldCancelAllCommands) {
      return { status: "CANCELLED", reason: CancelledReason.WaitingSessionConfirmation };
    }
    switch (cmd.type) {
      case "UNDO":
        if (!this.canUndo()) {
          return { status: "CANCELLED", reason: CancelledReason.EmptyUndoStack };
        }
        break;
      case "REDO":
        if (!this.canRedo()) {
          return { status: "CANCELLED", reason: CancelledReason.EmptyRedoStack };
        }
        break;
    }
    switch (cmd.type) {
      case "UNDO":
      case "REDO":
        // History changes (undo & redo) are *not* applied optimistically on the local state.
        // We wait a global confirmation from the server. The goal is to avoid handling concurrent
        // history changes on multiple clients which are very hard to manage correctly.
        this.requestHistoryChange(cmd.type);
        return { status: "CANCELLED", reason: CancelledReason.WaitingSessionConfirmation };
    }
    return { status: "SUCCESS" };
  }

  private requestHistoryChange(type: "UNDO" | "REDO") {
    const id = type === "UNDO" ? this.undoStack.pop() : this.redoStack.pop();
    if (!id) {
      return;
    }
    this.shouldCancelAllCommands = true;
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
    return this.redoStack.length > 0;
  }

  private onNewLocalStateUpdate({ id }: { id: UID }) {
    this.undoStack.push(id);
    this.redoStack = [];
    if (this.undoStack.length > MAX_HISTORY_STEPS) {
      this.undoStack.shift();
    }
  }

  private selectiveUndo() {
    this.dispatch("UNDO");
    this.shouldCancelAllCommands = false;
  }

  private selectiveRedo() {
    this.dispatch("REDO");
    this.shouldCancelAllCommands = false;
  }
}
