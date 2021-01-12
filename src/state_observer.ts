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
    const [root, ...path] = args as [any, string | number];
    let value = root as any;
    let key = path[path.length - 1];
    for (let pathIndex = 0; pathIndex <= path.length - 2; pathIndex++) {
      const p = path[pathIndex];
      if (value[p] === undefined) {
        const nextPath = path[pathIndex + 1];
        value[p] = createEmptyStructure(nextPath);
      }
      value = value[p];
    }
    if (value[key] === val) {
      return;
    }
    this.changes.push({
      root,
      path,
      before: value[key],
      after: val,
    });
    if (val === undefined) {
      delete value[key];
    } else {
      value[key] = val;
    }
  }
}
