import { lazy } from "../helpers";
import type { Lazy, Transformation, UID } from "../types";

/**
 * An Operation can be executed to change a data structure from state A
 * to state B.
 * It should hold the necessary data used to perform this transition.
 * It should be possible to revert the changes made by this operation.
 *
 * In the context of o-spreadsheet, the data from an operation would
 * be a revision (the commands are used to execute it, the `changes` are used
 * to revert it).
 */
export class Operation<T> {
  constructor(readonly id: UID, readonly data: T) {}

  transformed(transformation: Transformation<T>): Operation<T> {
    return new LazyOperation<T>(
      this.id,
      lazy(() => transformation(this.data))
    );
  }
}

class LazyOperation<T> implements Operation<T> {
  constructor(readonly id: UID, private readonly lazyData: Lazy<T>) {}

  get data(): T {
    return this.lazyData();
  }

  transformed(transformation: Transformation<T>): Operation<T> {
    return new LazyOperation(this.id, this.lazyData.map(transformation));
  }
}
