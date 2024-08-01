import type { OperationSequenceNode, UID } from "../types";

/**
 * An execution object is a sequence of executionSteps (each execution step is an operation in a branch).
 *
 * You can iterate over the steps of an execution
 * ```js
 * for (const operation of execution) {
 *   // ... do something
 * }
 * ```
 */

export class OperationSequence<T> implements Iterable<OperationSequenceNode<T>> {
  constructor(private readonly operations: Iterable<OperationSequenceNode<T>>) {}

  [Symbol.iterator](): Iterator<OperationSequenceNode<T>, void> {
    return this.operations[Symbol.iterator]();
  }

  /**
   * Stop the operation sequence at a given operation
   * @param operationId included
   */
  stopWith(operationId: UID): OperationSequence<T> {
    function* filter(execution: Iterable<OperationSequenceNode<T>>, operationId: UID) {
      for (const step of execution) {
        yield step;
        if (step.operation.id === operationId) {
          return;
        }
      }
    }

    return new OperationSequence(filter(this.operations, operationId));
  }

  /**
   * Stop the operation sequence before a given operation
   * @param operationId excluded
   */
  stopBefore(operationId: UID): OperationSequence<T> {
    function* filter(execution: Iterable<OperationSequenceNode<T>>, operationId: UID) {
      for (const step of execution) {
        if (step.operation.id === operationId) {
          return;
        }
        yield step;
      }
    }

    return new OperationSequence(filter(this.operations, operationId));
  }

  /**
   * Start the operation sequence at a given operation
   * @param operationId excluded
   */
  startAfter(operationId: UID): OperationSequence<T> {
    function* filter(execution: Iterable<OperationSequenceNode<T>>, operationId: UID) {
      let skip = true;
      for (const step of execution) {
        if (!skip) {
          yield step;
        }
        if (step.operation.id === operationId) {
          skip = false;
        }
      }
    }

    return new OperationSequence(filter(this.operations, operationId));
  }
}
