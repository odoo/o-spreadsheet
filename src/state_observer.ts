import produce from "immer";
import { createEmptyStructure } from "./helpers/state_manager_helpers";
import { CoreCommand, HistoryChange } from "./types";

export class StateObserver {
  private changes: HistoryChange[] = [];
  private commands: CoreCommand[] = [];

  /**
   * Record the changes which could happen in the given callback, save them in a
   * new revision with the given id and userId.
   */
  recordChanges(callback: () => void): { changes: HistoryChange[]; commands: CoreCommand[] } {
    this.changes = [];
    this.commands = [];
    callback();
    return { changes: this.changes, commands: this.commands };
  }

  addCommand(command: CoreCommand) {
    this.commands.push(command);
  }

  addChange(...args: any[]) {
    const val: any = args.pop();
    const [root, ...path] = args;
    if (path.length === 1) {
      // only first property and value
      const key = path[0];
      this.changes.push({
        root,
        path,
        before: root[key],
        after: val,
      });
      if (val === undefined) {
        delete root[key];
      } else {
        root[key] = val;
      }
      return;
    }
    const value = root[path[0]] as any;
    const nextValue = produce(value, (draft) => {
      let key = path[path.length - 1];
      for (let pathIndex = 1; pathIndex <= path.length - 2; pathIndex++) {
        const p = path[pathIndex];
        if (draft[p] === undefined) {
          const nextPath = path[pathIndex + 1];
          draft[p] = createEmptyStructure(nextPath);
        }
        draft = draft[p];
      }
      // if (draft[key] === val) {
      //   return;
      // }
      if (val === undefined) {
        delete draft[key];
      } else {
        draft[key] = val;
      }
    });
    this.changes.push({
      root,
      path,
      before: root[path[0]],
      after: nextValue,
    });
    root[path[0]] = nextValue;
  }
}
