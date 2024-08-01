import type { TransformationFactory, UID } from "../types";
import { Branch } from "./branch";
import { Operation } from "./operation";
import type { OperationSequence } from "./operation_sequence";
import { Tree } from "./tree";

export class SelectiveHistory<T = unknown> {
  private HEAD_BRANCH: Branch<T>;
  private HEAD_OPERATION: Operation<T>;
  private tree: Tree<T>;

  private readonly applyOperation: (data: T) => void;
  private readonly revertOperation: (data: T) => void;
  private readonly buildEmpty: (id: UID) => T;
  private readonly buildTransformation: TransformationFactory<T>;

  /**
   * The selective history is a data structure used to register changes/updates of a state.
   * Each change/update is called an "operation".
   * The data structure allows to easily cancel (and redo) any operation individually.
   * An operation can be represented by any data structure. It can be a "command", a "diff", etc.
   * However it must have the following properties:
   * - it can be applied to modify the state
   * - it can be reverted on the state such that it was never executed.
   * - it can be transformed given other operation (Operational Transformation)
   *
   * Since this data structure doesn't know anything about the state nor the structure of
   * operations, the actual work must be performed by external functions given as parameters.
   * @param initialOperationId
   * @param applyOperation a function which can apply an operation to the state
   * @param revertOperation  a function which can revert an operation from the state
   * @param buildEmpty  a function returning an "empty" operation.
   *                    i.e an operation that leaves the state unmodified once applied or reverted
   *                    (used for internal implementation)
   * @param buildTransformation Factory used to build transformations
   */
  constructor(args: {
    initialOperationId: UID;
    applyOperation: (data: T) => void;
    revertOperation: (data: T) => void;
    buildEmpty: (id: UID) => T;
    buildTransformation: TransformationFactory<T>;
  }) {
    this.applyOperation = args.applyOperation;
    this.revertOperation = args.revertOperation;
    this.buildEmpty = args.buildEmpty;
    this.buildTransformation = args.buildTransformation;

    this.HEAD_BRANCH = new Branch<T>(this.buildTransformation);
    this.tree = new Tree(this.buildTransformation, this.HEAD_BRANCH);
    const initialOperationId = args.initialOperationId;
    const initial = new Operation(initialOperationId, this.buildEmpty(initialOperationId));
    this.tree.insertOperationLast(this.HEAD_BRANCH, initial);
    this.HEAD_OPERATION = initial;
  }

  /**
   * Return the operation identified by its id.
   */
  get(operationId: UID): T {
    return this.tree.findOperation(this.HEAD_BRANCH, operationId).operation.data;
  }

  /**
   * Append a new operation as the last one
   */
  append(operationId: UID, data: T) {
    const operation = new Operation(operationId, data);
    const branch = this.tree.getLastBranch();
    this.tree.insertOperationLast(branch, operation);
    this.HEAD_BRANCH = branch;
    this.HEAD_OPERATION = operation;
  }

  /**
   * Insert a new operation after a specific operation (may not be the last operation).
   * Following operations will be transformed according
   * to the new operation.
   */
  insert(operationId: UID, data: T, insertAfter: UID) {
    const operation = new Operation<T>(operationId, data);
    this.revertTo(insertAfter);
    this.tree.insertOperationAfter(this.HEAD_BRANCH, operation, insertAfter);
    this.fastForward();
  }

  /**
   * @param operationId operation to undo
   * @param undoId the id of the "undo operation"
   * @param insertAfter the id of the operation after which to insert the undo
   */
  undo(operationId: UID, undoId: UID, insertAfter: UID) {
    const { branch, operation } = this.tree.findOperation(this.HEAD_BRANCH, operationId);
    this.revertBefore(operationId);
    this.tree.undo(branch, operation);
    this.fastForward();
    this.insert(undoId, this.buildEmpty(undoId), insertAfter);
  }

  /**
   * @param operationId operation to redo
   * @param redoId the if of the "redo operation"
   * @param insertAfter the id of the operation after which to insert the redo
   */
  redo(operationId: UID, redoId: UID, insertAfter: UID) {
    const { branch } = this.tree.findOperation(this.HEAD_BRANCH, operationId);
    this.revertBefore(operationId);
    this.tree.redo(branch);
    this.fastForward();
    this.insert(redoId, this.buildEmpty(redoId), insertAfter);
  }

  drop(operationId: UID) {
    this.revertBefore(operationId);
    this.tree.drop(operationId);
  }

  getRevertedExecution(): T[] {
    const data: T[] = [];
    const operations = this.tree.revertedExecution(this.HEAD_BRANCH);
    for (const { operation } of operations) {
      data.push(operation.data);
    }
    return data;
  }

  /**
   * Revert the state as it was *before* the given operation was executed.
   */
  private revertBefore(operationId: UID) {
    const execution = this.tree.revertedExecution(this.HEAD_BRANCH).stopWith(operationId);
    this.revert(execution);
  }

  /**
   * Revert the state as it was *after* the given operation was executed.
   */
  private revertTo(operationId: UID | null) {
    const execution = operationId
      ? this.tree.revertedExecution(this.HEAD_BRANCH).stopBefore(operationId)
      : this.tree.revertedExecution(this.HEAD_BRANCH);
    this.revert(execution);
  }

  /**
   * Revert an execution
   */
  private revert(execution: OperationSequence<T>) {
    for (const { next, operation, isCancelled } of execution) {
      if (!isCancelled) {
        this.revertOperation(operation.data);
      }
      if (next) {
        this.HEAD_BRANCH = next.branch;
        this.HEAD_OPERATION = next.operation;
      }
    }
  }

  /**
   * Replay the operations between the current HEAD_BRANCH and the end of the tree
   */
  private fastForward() {
    const operations = this.HEAD_OPERATION
      ? this.tree.execution(this.HEAD_BRANCH).startAfter(this.HEAD_OPERATION.id)
      : this.tree.execution(this.HEAD_BRANCH);
    for (const { operation: operation, branch, isCancelled } of operations) {
      if (!isCancelled) {
        this.applyOperation(operation.data);
      }
      this.HEAD_OPERATION = operation;
      this.HEAD_BRANCH = branch;
    }
  }
}
