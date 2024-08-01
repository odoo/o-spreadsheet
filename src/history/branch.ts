import type { Transformation, TransformationFactory, UID } from "../types";
import type { Operation } from "./operation";

/**
 * A branch holds a sequence of operations.
 * It can be represented as "A - B - C - D" if A, B, C and D are executed one
 * after the other.
 *
 * @param buildTransformation Factory to build transformations
 * @param operations initial operations
 */
export class Branch<T> {
  constructor(
    private readonly buildTransformation: TransformationFactory<T>,
    private operations: Operation<T>[] = []
  ) {}

  getOperations(): readonly Operation<T>[] {
    return this.operations;
  }

  getOperation(operationId: UID): Operation<T> {
    const operation = this.operations.find((op) => op.id === operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }
    return operation;
  }

  getLastOperationId(): UID | undefined {
    return this.operations[this.operations.length - 1]?.id;
  }

  /**
   * Get the id of the operation appears first in the list of operations
   */
  getFirstOperationAmong(op1: UID, op2: UID): UID {
    for (const operation of this.operations) {
      if (operation.id === op1) return op1;
      if (operation.id === op2) return op2;
    }
    throw new Error(`Operation ${op1} and ${op2} not found`);
  }

  contains(operationId: UID): boolean {
    return !!this.operations.find((operation) => operation.id === operationId);
  }

  /**
   * Add the given operation as the first operation
   */
  prepend(operation: Operation<T>) {
    const transformation = this.buildTransformation.with(operation.data);
    this.operations = [
      operation,
      ...this.operations.map((operation) => operation.transformed(transformation)),
    ];
  }

  /**
   * add the given operation after the given predecessorOpId
   */
  insert(newOperation: Operation<T>, predecessorOpId: UID) {
    const transformation = this.buildTransformation.with(newOperation.data);
    const { before, operation, after } = this.locateOperation(predecessorOpId);
    this.operations = [
      ...before,
      operation,
      newOperation,
      ...after.map((operation) => operation.transformed(transformation)),
    ];
  }

  /**
   * Add the given operation as the last operation
   */
  append(operation: Operation<T>) {
    this.operations.push(operation);
  }

  /**
   * Append operations in the given branch to this branch.
   */
  appendBranch(branch: Branch<T>) {
    this.operations = this.operations.concat(branch.operations);
  }

  /**
   * Create and return a copy of this branch, starting after the given operationId
   */
  fork(operationId: UID): Branch<T> {
    const { after } = this.locateOperation(operationId);
    return new Branch(this.buildTransformation, after);
  }

  /**
   * Transform all the operations in this branch with the given transformation
   */
  transform(transformation: Transformation<T>) {
    this.operations = this.operations.map((operation) => operation.transformed(transformation));
  }

  /**
   * Cut the branch before the operation, meaning the operation
   * and all following operations are dropped.
   */
  cutBefore(operationId: UID) {
    this.operations = this.locateOperation(operationId).before;
  }

  /**
   * Cut the branch after the operation, meaning all following operations are dropped.
   */
  cutAfter(operationId: UID) {
    const { before, operation } = this.locateOperation(operationId);
    this.operations = before.concat([operation]);
  }

  /**
   * Find an operation in this branch based on its id.
   * This returns the operation itself, operations which comes before it
   * and operation which comes after it.
   */
  private locateOperation(operationId: UID): {
    before: Operation<T>[];
    operation: Operation<T>;
    after: Operation<T>[];
  } {
    const operationIndex = this.operations.findIndex((step) => step.id === operationId);
    if (operationIndex === -1) {
      throw new Error(`Operation ${operationId} not found`);
    }
    return {
      before: this.operations.slice(0, operationIndex),
      operation: this.operations[operationIndex],
      after: this.operations.slice(operationIndex + 1),
    };
  }
}
