import { linkNext } from "../helpers";
import type { OperationSequenceNode, Transformation, TransformationFactory, UID } from "../types";
import type { Branch } from "./branch";
import type { Operation } from "./operation";
import { OperationSequence } from "./operation_sequence";

/**
 * The tree is a data structure used to maintain the different branches of the
 * SelectiveHistory.
 *
 * Branches can be "stacked" on each other and an execution path can be derived
 * from any stack of branches. The rules to derive this path is explained below.
 *
 * An operation can be cancelled/undone by inserting a new branch below
 * this operation.
 * e.g
 *    Given the branch A    B   C
 *    To undo B, a new branching branch is inserted at operation B.
 *    ```txt
 *    A   B   C   D
 *        >   C'  D'
 *    ```
 *    A new execution path can now be derived. At each operation:
 *    - if there is a lower branch, don't execute it and go to the operation below
 *    - if not, execute it and go to the operation on the right.
 *    The execution path is   A   C'    D'
 *    Operation C and D have been adapted (transformed) in the lower branch
 *    since operation B is not executed in this branch.
 *
 */
export class Tree<T = unknown> {
  private readonly branches: Branch<T>[];
  private branchingOperationIds: Map<Branch<T>, UID | undefined> = new Map();

  constructor(
    private readonly buildTransformation: TransformationFactory<T>,
    initialBranch: Branch<T>
  ) {
    this.branches = [initialBranch];
  }

  /**
   * Return the last branch of the entire stack of branches.
   */
  getLastBranch(): Branch<T> {
    return this.branches[this.branches.length - 1];
  }

  /**
   * Return the sequence of operations from this branch
   * until the very last branch.
   */
  execution(branch: Branch<T>): OperationSequence<T> {
    return new OperationSequence(linkNext(this._execution(branch), this._execution(branch)));
  }

  /**
   * Return the sequence of operations from this branch
   * to the very first branch.
   */
  revertedExecution(branch: Branch<T>): OperationSequence<T> {
    return new OperationSequence(
      linkNext(this._revertedExecution(branch), this._revertedExecution(branch))
    );
  }

  /**
   * Append an operation to the end of the tree.
   * Also insert the (transformed) operation in all previous branches.
   *
   * Adding operation `D` to the last branch
   * ```txt
   *  A1   B1   C1
   *  >    B2   C2
   * ```
   * will give
   * ```txt
   *  A1   B1   C1   D'   with D' = D transformed with A1
   *  >    B2   C2   D
   * ```
   */
  insertOperationLast(branch: Branch<T>, operation: Operation<T>) {
    const insertAfter =
      branch.getLastOperationId() || this.previousBranch(branch)?.getLastOperationId();
    branch.append(operation);
    if (insertAfter) {
      this.insertPrevious(branch, operation, insertAfter);
    }
  }

  /**
   * Insert a new operation after an other operation.
   * The operation will be inserted in this branch, in next branches (transformed)
   * and in previous branches (also transformed).
   *
   * Given
   * ```txt
   *  1: A1   B1   C1
   *  2: >    B2   C2
   *  3:      >    C3
   * ```
   * Inserting D to branch 2 gives
   * ```txt
   *  1: A1   B1   C1   D1          D1 = D transformed with A1
   *  2: >    B2   C2   D     with  D  = D
   *  3:      >    C3   D2          D2 = D transformed without B2 (B2⁻¹)
   * ```
   */
  insertOperationAfter(branch: Branch<T>, operation: Operation<T>, predecessorOpId: UID) {
    branch.insert(operation, predecessorOpId);
    this.updateNextWith(branch, operation, predecessorOpId);
    this.insertPrevious(branch, operation, predecessorOpId);
  }

  /**
   * Create a new branching branch at the given operation.
   * This cancels the operation from the execution path.
   */
  undo(branch: Branch<T>, operation: Operation<T>) {
    const transformation = this.buildTransformation.without(operation.data);
    const branchingId = this.branchingOperationIds.get(branch);
    this.branchingOperationIds.set(branch, operation.id);
    const nextBranch = branch.fork(operation.id);
    if (branchingId) {
      this.branchingOperationIds.set(nextBranch, branchingId);
    }
    this.insertBranchAfter(branch, nextBranch);
    this.transform(nextBranch, transformation);
  }

  /**
   * Remove the branch just after this one. This un-cancels (redo) the branching
   * operation. Lower branches will be transformed accordingly.
   *
   * Given
   * ```txt
   *  1: A1   B1   C1
   *  2: >    B2   C2
   *  3:      >    C3
   * ```
   * removing the next branch of 1 gives
   *
   * ```txt
   *  1: A1   B1   C1
   *  2:      >    C3'   with  C3' = C1 transformed without B1 (B1⁻¹)
   * ```
   */
  redo(branch: Branch<T>) {
    const removedBranch = this.nextBranch(branch);
    if (!removedBranch) return;
    const nextBranch = this.nextBranch(removedBranch);
    this.removeBranchFromTree(removedBranch);

    const undoBranchingId = this.branchingOperationIds.get(removedBranch);
    if (undoBranchingId) {
      this.branchingOperationIds.set(branch, undoBranchingId);
    } else {
      this.branchingOperationIds.delete(branch);
    }
    if (nextBranch) {
      this.rebaseUp(nextBranch);
    }
  }

  /**
   * Drop the operation and all following operations in every
   * branch
   */
  drop(operationId: UID) {
    for (const branch of this.branches) {
      if (branch.contains(operationId)) {
        branch.cutBefore(operationId);
      }
    }
  }

  /**
   * Find the operation in the execution path.
   */
  findOperation(branch: Branch<T>, operationId: UID): OperationSequenceNode<T> {
    for (const operation of this.revertedExecution(branch)) {
      if (operation.operation.id === operationId) {
        return operation;
      }
    }
    throw new Error(`Operation ${operationId} not found`);
  }

  /**
   * Rebuild transformed operations of this branch based on the upper branch.
   *
   * Given the following structure:
   * ```txt
   *  1: A1   B1    C1
   *  2: >    B2    C2
   *  3:      >     C3
   * ```
   * Rebasing branch "2" gives
   * ```txt
   *  1: A1   B1    C1
   *  2: >    B2'   C2'  With  B2' = B1 transformed without A1 and C2' = C1 transformed without A1
   *  3:      >     C3'        C3' = C2' transformed without B2'
   * ```
   */
  private rebaseUp(branch: Branch<T>) {
    const { previousBranch, branchingOperation } = this.findPreviousBranchingOperation(branch);
    if (!previousBranch || !branchingOperation) return;
    const rebaseTransformation = this.buildTransformation.without(branchingOperation.data);
    const newBranch = previousBranch.fork(branchingOperation.id);
    this.branchingOperationIds.set(newBranch, this.branchingOperationIds.get(branch));
    this.removeBranchFromTree(branch);
    this.insertBranchAfter(previousBranch, newBranch);
    newBranch.transform(rebaseTransformation);
    const nextBranch = this.nextBranch(newBranch);
    if (nextBranch) {
      this.rebaseUp(nextBranch);
    }
  }

  private removeBranchFromTree(branch: Branch<T>) {
    const index = this.branches.findIndex((l) => l === branch);
    this.branches.splice(index, 1);
  }

  private insertBranchAfter(branch: Branch<T>, toInsert: Branch<T>) {
    const index = this.branches.findIndex((l) => l === branch);
    this.branches.splice(index + 1, 0, toInsert);
  }

  /**
   * Update the branching branch of this branch, either by (1) inserting the new
   * operation in it or (2) by transforming it.
   * (1) If the operation is positioned before the branching branch, the branching
   *     branch should be transformed with this operation.
   * (2) If it's positioned after, the operation should be inserted in the
   *     branching branch.
   */
  private updateNextWith(branch: Branch<T>, operation: Operation<T>, predecessorOpId: UID) {
    const branchingId = this.branchingOperationIds.get(branch);
    const nextBranch = this.nextBranch(branch);
    if (!branchingId || !nextBranch) {
      return;
    }
    if (branch.getFirstOperationAmong(predecessorOpId, branchingId) === branchingId) {
      const transformedOperation = this.addToNextBranch(
        branch,
        nextBranch,
        branchingId,
        operation,
        predecessorOpId
      );
      this.updateNextWith(nextBranch, transformedOperation, predecessorOpId);
    } else {
      const transformation = this.buildTransformation.with(operation.data);
      this.transform(nextBranch, transformation);
    }
  }

  private addToNextBranch(
    branch: Branch<T>,
    nextBranch: Branch<T>,
    branchingId: UID,
    operation: Operation<T>,
    predecessorOpId: UID
  ): Operation<T> {
    // If the operation is inserted after the branching operation, it should
    // be positioned first.
    let transformedOperation: Operation<T> = operation;
    if (predecessorOpId === branchingId) {
      transformedOperation = this.getTransformedOperation(branch, branchingId, operation);
      nextBranch.prepend(transformedOperation);
    } else if (nextBranch.contains(predecessorOpId)) {
      transformedOperation = this.getTransformedOperation(branch, branchingId, operation);
      nextBranch.insert(transformedOperation, predecessorOpId);
    } else {
      nextBranch.append(operation);
    }
    return transformedOperation;
  }

  private getTransformedOperation(
    branch: Branch<T>,
    branchingId: UID,
    operation: Operation<T>
  ): Operation<T> {
    const branchingOperation = branch.getOperation(branchingId);
    const branchingTransformation = this.buildTransformation.without(branchingOperation.data);
    return operation.transformed(branchingTransformation);
  }

  /**
   * Check if this branch should execute the given operation.
   * i.e. If the operation is not cancelled by a branching branch.
   */
  private shouldExecute(branch: Branch<T>, operation: Operation<T>): boolean {
    return operation.id !== this.branchingOperationIds.get(branch);
  }

  private transform(branch: Branch<T>, transformation: Transformation<T>) {
    branch.transform(transformation);
    const nextBranch = this.nextBranch(branch);
    if (nextBranch) {
      this.transform(nextBranch, transformation);
    }
  }

  /**
   * Insert a new operation in previous branches. The operations which are
   * positioned after the inserted operations are transformed with the newly
   * inserted operations. This one is also transformed, with the branching
   * operation.
   */
  private insertPrevious(branch: Branch<T>, newOperation: Operation<T>, insertAfter: UID) {
    const { previousBranch, branchingOperation } = this.findPreviousBranchingOperation(branch);
    if (!previousBranch || !branchingOperation) return;
    const transformation = this.buildTransformation.with(branchingOperation.data);
    const branchTail = branch.fork(insertAfter);
    branchTail.transform(transformation);
    previousBranch.cutAfter(insertAfter);
    previousBranch.appendBranch(branchTail);
    const operationToInsert = newOperation.transformed(transformation);
    this.insertPrevious(previousBranch, operationToInsert, insertAfter);
  }

  private findPreviousBranchingOperation(branch: Branch<T>): {
    previousBranch?: Branch<T>;
    branchingOperation?: Operation<T>;
  } {
    const previousBranch = this.previousBranch(branch);
    if (!previousBranch) return { previousBranch: undefined, branchingOperation: undefined };
    const previousBranchingId = this.branchingOperationIds.get(previousBranch);
    if (!previousBranchingId) return { previousBranch: undefined, branchingOperation: undefined };
    return {
      previousBranch,
      branchingOperation: previousBranch.getOperation(previousBranchingId),
    };
  }

  /**
   * Retrieve the next branch of the given branch
   */
  private nextBranch(branch: Branch<T>): Branch<T> | undefined {
    const index = this.branches.findIndex((l) => l === branch);
    if (index === -1) {
      return undefined;
    }
    return this.branches[index + 1];
  }

  /**
   * Retrieve the previous branch of the given branch
   */
  private previousBranch(branch: Branch<T>): Branch<T> | undefined {
    const index = this.branches.findIndex((l) => l === branch);
    if (index === -1) {
      return undefined;
    }
    return this.branches[index - 1];
  }

  /**
   * Yields the sequence of operations to execute, in reverse order.
   */
  private *_revertedExecution(
    branch: Branch<T>
  ): Generator<Omit<OperationSequenceNode<T>, "next">, void, undefined> {
    const branchingOperationId = this.branchingOperationIds.get(branch);
    let afterBranchingPoint = !!branchingOperationId;
    const operations = branch.getOperations();
    for (let i = operations.length - 1; i >= 0; i--) {
      const operation = operations[i];
      if (operation.id === branchingOperationId) {
        afterBranchingPoint = false;
      }
      if (!afterBranchingPoint) {
        yield {
          operation: operation,
          branch: branch,
          isCancelled: !this.shouldExecute(branch, operation),
        };
      }
    }
    const previous = this.previousBranch(branch);
    yield* previous ? this._revertedExecution(previous) : [];
  }

  /**
   * Yields the sequence of operations to execute
   */
  private *_execution(
    branch: Branch<T>
  ): Generator<Omit<OperationSequenceNode<T>, "next">, void, undefined> {
    for (const operation of branch.getOperations()) {
      yield {
        operation: operation,
        branch: branch,
        isCancelled: !this.shouldExecute(branch, operation),
      };
      if (operation.id === this.branchingOperationIds.get(branch)) {
        const next = this.nextBranch(branch);
        yield* next ? this._execution(next) : [];
        return;
      }
    }
    if (!this.branchingOperationIds.get(branch)) {
      const next = this.nextBranch(branch);
      yield* next ? this._execution(next) : [];
    }
  }
}
