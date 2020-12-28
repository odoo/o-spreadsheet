import { UID } from "./types/misc";

class CommittedData<T> {
  id?: UID;
  data?: T;
}

abstract class AbstractCommit {
  id?: UID;
  previous?: AbstractCommit;
  next?: AbstractCommit;
}

class StandaloneCommit<T> extends AbstractCommit {
  data?: T
}

// can a GroupedCommit contain a GroupedCommit ? yes
// can a GroupedCommit overlap with another GroupedCommit?
class GroupedCommit<T> extends AbstractCommit {
  commits: Commit<T>[] = []

  contains(commitId: UID): boolean {
    // TODO
    return true;
  }

}

type Commit<T> = StandaloneCommit<T> | GroupedCommit<T>


// Is GroupedCommit actually the same as Git? i.e. list of commits
export class Git<T> {
  private _HEAD: Commit<T> = {};

  constructor(protected apply: (data: T) => void, protected revert: (data: T) => void) {}

  commit(data: T) {
    const commit = new StandaloneCommit<T>();
    commit.data = data;
    this.addHead(commit);
  }

  undo(commitId: UID) {
    this.checkout(commitId);

    // // group commits between
    // if (this.HEAD.previous) {
    //   this._HEAD = this.HEAD.previous
    // }
  }

  redo(commitId: UID) {
    // "Free" an undo group
  }
/**
 * Each undo adds a "layer" in the "undo stack"
 * Each commit keep are reference to the previous and next commit
 * and to the "same" commit in the upper and lower layers

0:        A .... B .... C .... D .... E
                 ^      ^      ^      ^
                 ^      ^      ^      ^
1: UNDO B        BX.... C'.... D'.... E'
                               ^      ^
                               ^      ^
2: UNDO D                      D'X... E''


NOW REDO B  => remonter jusqu'à B (left and up)
            => delete "row" 1
            => follow path (right and down)
            => when going right: apply command
            => when going down: transform and apply command (except the first which is cancelled)

0:        A .... B .... C .... D .... E
                               ^      ^
                               ^      ^
2':UNDO D                      D'X... E'''



******************
Same with 3 UNDOes
******************

0:        A ...... B ...... C ...... D ...... E ...... F ...... G
                   ^        ^        ^        ^        ^        ^
                   ^        ^        ^        ^        ^        ^
1: UNDO B          BX...... C'...... D'...... E' ..... F'...... G'
                                     ^        ^        ^        ^
                                     ^        ^        ^        ^
2: UNDO D                            D'X..... E" ..... F" ...... G"
                                              ^        ^        ^
                                              ^        ^        ^
3: UNDO E                                     E"X .... F"'..... G"'


REDO D  => remonter jusqu'à D' (left and up)
        => delete "row" 2
        => follow path (right and down)
        => when going right: apply command
        => when going down: transform and apply commands (except the first which is cancelled)
0:        A ...... B ...... C ...... D ...... E ...... F ...... G
                   ^        ^        ^        ^        ^        ^
                   ^        ^        ^        ^        ^        ^
1: UNDO B          BX...... C'...... D'...... E' ..... F'...... G'
                                              ^        ^        ^
                                              ^        ^        ^
3':UNDO E                                     E"X..... F""..... G""


REDO B  => remonter jusqu'à B (left and up)
        => delete "row" 1
        => follow path (right and down)
        => when going right: apply command
        => when going down: transform and apply command (except the first which is cancelled)
0:        A ...... B ...... C ...... D ...... E ...... F ...... G
                                              ^        ^        ^
                                              ^        ^        ^
3":UNDO E                                     E"X..... F""'.... G""'


   */

  // private merge(commits: Commit<T>[]) {
  //   const commit = new Commit<Commit<T>[]>();
  //   commit.data = commits;
  //   this.addHead(commit);
  // }

  private checkout(commitId: UID) {
    let currentHead: Commit<T> | undefined = this.HEAD;
    while (currentHead && this.isInCommit(commitId, currentHead)) {
      currentHead = currentHead.previous;
    }
    if (currentHead) {
      this._HEAD = currentHead;
    } else {
      throw new Error(`No commit found with id ${commitId}`)
    }
    // TODO change the state !
  }

  private isInCommit(commitId: UID, commit: Commit<T>): boolean {
    if (commitId === commit.id) {
      return true;
    } else if (commit instanceof GroupedCommit) {
      return commit.contains(commitId)
    }
    return false;
  }

  private addHead(commit: Commit<T>) {
    commit.previous = this._HEAD;
    this._HEAD.next = commit;
    this._HEAD = commit;
  }

  get HEAD(): Commit<T> {
    return this._HEAD;
  }
}
