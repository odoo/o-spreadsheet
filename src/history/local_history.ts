import * as owl from "@odoo/owl";
import { Session } from "../collaborative/session";
import { MAX_HISTORY_STEPS } from "../constants";
import { Selection } from "../plugins/ui/selection";
import { CancelledReason, Command, CommandDispatcher, CommandResult, Getters, UID } from "../types";

interface HistoryStep {
  revisionId: UID;
  activeSelection: {
    sheetId: UID;
    selection: Selection;
  };
}

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
  private undoStack: HistoryStep[] = [];

  /**
   * Ids of the revisions which can be redone
   */
  private redoStack: HistoryStep[] = [];

  /**
   * Flag used to block all commands when an undo or redo is triggered, until
   * it is accepted on the server
   */
  private isWaitingForUndoRedo: boolean = false;

  private activePosition?: {
    sheetId: UID;
    selection: Selection;
  };

  constructor(
    private dispatch: CommandDispatcher["dispatch"],
    private getters: Getters,
    private session: Session
  ) {
    super();
    this.session.on("new-local-state-update", this, this.onNewLocalStateUpdate);
    this.session.on("revision-undone", this, this.selectiveUndo);
    this.session.on("revision-redone", this, this.selectiveRedo);
  }

  init() {
    const activeSheet = this.getters.getActiveSheet();
    if (!activeSheet) return;
    this.activePosition = {
      selection: { ...this.getters.getSelection() },
      sheetId: this.getters.getActiveSheetId(),
    };
  }

  allowDispatch(cmd: Command): CommandResult {
    if (this.isWaitingForUndoRedo) {
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
    const step = type === "UNDO" ? this.undoStack.pop() : this.redoStack.pop();
    if (!step) {
      return;
    }
    this.isWaitingForUndoRedo = true;
    if (type === "UNDO") {
      this.redoStack.push(step);
      this.session.undo(step.revisionId);
    } else {
      this.undoStack.push(step);
      this.session.redo(step.revisionId);
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private onNewLocalStateUpdate({ id }: { id: UID }) {
    this.undoStack.push({
      activeSelection: this.activePosition!,
      revisionId: id,
    });
    this.redoStack = [];
    if (this.undoStack.length > MAX_HISTORY_STEPS) {
      this.undoStack.shift();
    }
  }

  private selectiveUndo({ revisionId, isLocal }: { revisionId: UID; isLocal: boolean }) {
    const activeSelection = isLocal
      ? this.redoStack[this.redoStack.length - 1].activeSelection
      : undefined;
    this.dispatch("UNDO", {
      activeSelection,
    });
    this.isWaitingForUndoRedo = false;
  }

  private selectiveRedo({ revisionId, isLocal }: { revisionId: UID; isLocal: boolean }) {
    const activeSelection = isLocal
      ? this.undoStack[this.undoStack.length - 1].activeSelection
      : undefined;
    this.dispatch("REDO", {
      activeSelection,
    });
    this.isWaitingForUndoRedo = false;
  }
}
