import { createEmptyStructure } from "./helpers/state_manager_helpers";
import { CoreCommand, HistoryChange } from "./types";

type HistoryPath = [any, ...(number | string)[]];

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

  addChange(...args: [...HistoryPath, any]) {
    const val: any = args.pop();
    const plugin = args[0];
    let value = plugin as any;
    let key = args.at(-1);
    const pathLength = args.length - 2;
    for (let pathIndex = 1; pathIndex <= pathLength; pathIndex++) {
      const p = args[pathIndex];
      if (value[p] === undefined) {
        const nextPath = args[pathIndex + 1];
        value[p] = createEmptyStructure(nextPath);
      }
      value = value[p];
    }
    if (value[key] === val) {
      return;
    }
    this.changes.push({
      key,
      target: value,
      before: value[key],
    });
    if (val === undefined) {
      delete value[key];
    } else {
      value[key] = val;
    }
  }
}
