import { UID } from "./types/misc";

class CommittedData<T> {
  id?: UID;
  data?: T;
}

class Commit<T> extends CommittedData<T> {
  previous?: Commit<T>;
  next?: Commit<T>;
  children?: Commit<Commit<T>[]>;
}

export class Git<T> {
  private _HEAD: Commit<T> = {};

  constructor(protected apply: (data: T) => void, protected revert: (data: T) => void) {}

  commit(data: T) {
    const commit = new Commit<T>();
    commit.data = data;
    this.addHead(commit);
  }

  undo(commitId: UID) {
        
  }

  redo(commitId: UID) {}

  // private merge(commits: Commit<T>[]) {
  //   const commit = new Commit<Commit<T>[]>();
  //   commit.data = commits;
  //   this.addHead(commit);
  // }

  private checkout(commitId: UID) {
    let currentHead = this.HEAD;
    while (!this.isInCommit(commitId)) {
      currentHead = currentHead.previous;
    }
  }

  private isInCommit(commitId: UID, commit: Commit<T> | Commit<Commit<T>[]>): boolean {
    if (commitId === commit.id) {
      return true;
    }
    for (let c of commit.data)
  }

  private addHead(commit: Commit<T> | Commit<Commit<T>[]>) {
    commit.previous = this._HEAD;
    this._HEAD.next = commit;
    this._HEAD = commit;
  }

  get HEAD(): Commit<T> | Commit<Commit<T>[]> {
    return this._HEAD;
  }
}
