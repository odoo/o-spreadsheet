export interface HistoryChange {
  root: any;
  path: (string | number)[];
  before: any;
  after: any;
}

export interface HistoryStep {
  batch: HistoryChange[];
}

type Key = string | number;

export class GridHistory {
  static MAX_HISTORY_STEPS = 99;

  setState(root: any, path: Key[], value: any) {
    let current = root;
    for (let k of path.slice(0, -1)) {
      current = current[k];
    }
    current[path[path.length - 1]] = value;
  }

  startTracking() {
    // start a batch for tracking changes
  }

  stopTracking() {
    // complete a batch
  }

  undo() {}

  redo() {}
}
