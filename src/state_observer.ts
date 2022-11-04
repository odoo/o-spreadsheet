import { createDraft, finishDraft } from "immer";
import { createEmptyStructure } from "./helpers/state_manager_helpers";
import { CoreCommand, HistoryChange } from "./types";

export class StateObserver {
  private changes: HistoryChange[] = [];
  private commands: CoreCommand[] = [];
  private keys = new Map<any, Set<string>>();
  private drafts: [any, string, any, any][] = [];

  /**
   * Record the changes which could happen in the given callback, save them in a
   * new revision with the given id and userId.
   */
  recordChanges(callback: () => void): { changes: HistoryChange[]; commands: CoreCommand[] } {
    this.changes = [];
    this.commands = [];
    this.drafts = [];
    // this.keys = new Map();
    this.draftifyRegistered();
    callback();
    this.commitChanges();
    return { changes: this.changes, commands: this.commands };
  }

  addCommand(command: CoreCommand) {
    this.commands.push(command);
  }

  register(root: any, propertyKey: string) {
    this.keys.get(root)?.add(propertyKey) || this.keys.set(root, new Set([propertyKey]));
  }

  private draftifyRegistered() {
    for (const [root, properties] of this.keys) {
      for (const property of properties) {
        this.draftify(root, property);
      }
    }
  }

  private draftify(root: any, property: string) {
    this.register(root, property);
    if (property === "sheets") {
      debugger;
    }
    const val = root[property];
    const draft = this.createDraft(val);
    // console.log(root[property].constructor.name)
    if (typeof root[property] === "object" && root[property].constructor.name === "Proxy") {
      debugger;
    }
    this.drafts.push([root, property, draft, root[property]]);
    root[property] = draft;
  }

  private commitChanges() {
    for (const [root, property, draft, before] of this.drafts) {
      root[property] = this.finishDraft(draft);
      this.changes.push({
        root,
        path: [property],
        before: before,
        after: root[property],
      });
    }
    this.drafts = [];
  }

  private createDraft(value) {
    try {
      return createDraft(value);
    } catch (error) {
      return value; // TODO check it's a primitive value
    }
  }

  private finishDraft(draft) {
    try {
      return finishDraft(draft);
    } catch (error) {
      return draft; // not a draft, should be a primitive value;
    }
  }

  addChange(...args: any[]) {
    const val: any = args.pop();
    const [root, ...path] = args as [any, string | number];
    if (path[0] === "sheets") {
      // console.log(val)
    }
    const property = path[0] as string;
    if (!this.keys.get(root)?.has(path[0] as string)) {
      this.draftify(root, property);
    }
    if (path.length === 1) {
      // the original draft is never modified because it's completely
      // replaced by the new value
      // => draftify the new value
      // TODO investigate how often it happens
      const draft = this.drafts.find((draft) => draft[0] === root && draft[1] === property);
      if (draft) {
        draft[2] = this.createDraft(val);
      }
    }
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
    if (val === undefined) {
      // console.log(value)
      delete value[key];
    } else {
      value[key] = val;
    }
  }
}
