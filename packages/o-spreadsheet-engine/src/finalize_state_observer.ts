import { createEmptyStructure } from "./helpers";

type HistoryPath = [any, ...(number | string)[]];

interface Snapshot {
  target: any;
  key: string;
  before: any;
}

/**
 * FinalizeStateObserver tracks state changes during the handle+finalize
 * lifecycle and supports suspend/resume operations around async yield points.
 *
 * During async finalize, the UI may render between await points. To prevent
 * the UI from seeing inconsistent intermediate state (e.g. cleared caches
 * that haven't been recomputed yet), we can:
 * - suspend(): revert all tracked changes to their pre-command values
 * - resume(): re-apply the current values so finalize can continue
 *
 * This class tracks changes from two sources:
 * - Core plugin changes forwarded from StateObserver via trackChange()
 * - Derived plugin changes via addChange() (similar API to StateObserver)
 *
 * Changes are deduplicated by (target, key): only the first "before" value
 * is kept, so suspend always reverts to the pre-command state.
 */
export class FinalizeStateObserver {
  /**
   * Deduplicated map of tracked changes.
   * Key: unique identifier for (target, key) pair
   * Value: { target, key, before } where "before" is the value before the command started
   */
  private snapshots = new Map<string, Snapshot>();

  /**
   * Saved "after" values captured at suspend time.
   * Used by resume() to restore the current state.
   */
  private afterValues = new Map<string, any>();

  private _isActive = false;
  private _isSuspended = false;

  /** Counter for generating unique target IDs */
  private idCounter = 0;

  /** Maps object references to unique IDs for deduplication */
  private targetIds = new WeakMap<object, number>();

  get isActive(): boolean {
    return this._isActive;
  }

  get isSuspended(): boolean {
    return this._isSuspended;
  }

  /**
   * Start tracking changes for a new command dispatch.
   */
  begin() {
    this._isActive = true;
    this._isSuspended = false;
    this.snapshots.clear();
    this.afterValues.clear();
  }

  /**
   * Track a change that was already applied by StateObserver.
   * Only records the "before" value for suspend/resume — does NOT mutate state.
   */
  trackChange(target: any, key: string, before: any) {
    if (!this._isActive || this._isSuspended) {
      return;
    }
    const id = this.getId(target, key);
    if (!this.snapshots.has(id)) {
      this.snapshots.set(id, { target, key, before });
    }
  }

  /**
   * Record a derived state change: tracks the "before" AND mutates the state.
   * Same API as StateObserver.addChange().
   * Used by plugins via this.derived.update().
   */
  addChange(...args: [...HistoryPath, any]) {
    if (!this._isActive || this._isSuspended) {
      // Still apply the mutation even if not active/suspended,
      // so that plugin state is always updated.
      this.applyMutation(args);
      return;
    }

    const { target, key, before } = this.resolvePath(args);
    const val = args[args.length - 1];

    if (before === val) {
      return;
    }

    const id = this.getId(target, key);
    if (!this.snapshots.has(id)) {
      this.snapshots.set(id, { target, key, before });
    }

    // Apply the mutation
    if (val === undefined) {
      delete target[key];
    } else {
      target[key] = val;
    }
  }

  /**
   * Suspend: revert all tracked changes to pre-command values.
   * The UI will see a consistent pre-command state.
   */
  suspend() {
    if (!this._isActive || this._isSuspended) {
      return;
    }
    this._isSuspended = true;

    // Save current values and revert to "before"
    this.afterValues.clear();
    for (const [id, { target, key, before }] of this.snapshots) {
      this.afterValues.set(id, target[key]);
      target[key] = before;
    }
  }

  /**
   * Resume: restore the current state so finalize can continue.
   * New changes after resume will be tracked normally.
   */
  resume() {
    if (!this._isActive || !this._isSuspended) {
      return;
    }
    this._isSuspended = false;

    // Restore "after" values
    for (const [id, afterValue] of this.afterValues) {
      const snapshot = this.snapshots.get(id)!;
      snapshot.target[snapshot.key] = afterValue;
    }
    this.afterValues.clear();
  }

  /**
   * Commit: finalize is complete, state is consistent.
   * Stop tracking and clear all data.
   */
  commit() {
    if (this._isSuspended) {
      this.resume();
    }
    this._isActive = false;
    this.snapshots.clear();
    this.afterValues.clear();
  }

  /**
   * Resolve a path like [root, "key1", "key2", value] into
   * { target, key, before } where target["key"] will be mutated.
   */
  private resolvePath(args: any[]): { target: any; key: string; before: any } {
    const root = args[0];
    let value = root as any;
    const key = args[args.length - 2] as string;
    const pathLength = args.length - 3; // exclude root, last key, and value
    for (let pathIndex = 1; pathIndex <= pathLength; pathIndex++) {
      const p = args[pathIndex];
      if (value[p] === undefined) {
        const nextPath = args[pathIndex + 1];
        value[p] = createEmptyStructure(nextPath);
      }
      value = value[p];
    }
    return { target: value, key, before: value[key] };
  }

  /**
   * Apply mutation without tracking (used when observer is not active).
   */
  private applyMutation(args: any[]) {
    const { target, key } = this.resolvePath(args);
    const val = args[args.length - 1];
    if (val === undefined) {
      delete target[key];
    } else {
      target[key] = val;
    }
  }

  /**
   * Generate a unique string ID for a (target, key) pair.
   */
  private getId(target: any, key: string): string {
    let targetId = this.targetIds.get(target);
    if (targetId === undefined) {
      targetId = this.idCounter++;
      this.targetIds.set(target, targetId);
    }
    return `${targetId}:${key}`;
  }
}
