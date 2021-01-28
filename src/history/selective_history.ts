import { linkNext } from "../helpers";
import { UID } from "../types";

type Transformation<T = unknown> = (dataToTransform: T) => T;

interface TransformationFactory<T = unknown> {
  /**
   * Build a transformation function to transform any operation as if the execution of
   * a previous `operation` was omitted.
   */
  without: (operation: T) => Transformation<T>;
  /**
   * Build a transformation function to transform any operation as if a new `operation` was
   * executed before.
   */
  with: (operation: T) => Transformation<T>;
}

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
class Operation<T> {
  constructor(readonly id: UID, readonly data: T, public readonly isOriginal = true) {}

  transformed(transformation: Transformation<T>, isOriginal?: boolean): Operation<T> {
    return new Operation(
      this.id,
      transformation(this.data),
      isOriginal !== undefined ? isOriginal : this.isOriginal
    );
  }
}

interface ExecutionStep<T> {
  operation: Operation<T>;
  layer: Layer<T>;
  isCancelled: boolean;
  next?: {
    operation: Operation<T>;
    layer: Layer<T>;
  };
}

/**
 * An execution object is a sequence of operation.
 *
 * You can iterate over operations of an execution
 * ```js
 * for (const operation of execution) {
 *   // ... do something
 * }
 * ```
 */
class Execution<T> implements Iterable<ExecutionStep<T>> {
  constructor(private readonly operations: Iterable<ExecutionStep<T>>) {}
  [Symbol.iterator](): Iterator<ExecutionStep<T>, void, undefined> {
    return this.operations[Symbol.iterator]();
  }

  /**
   * Stop the operation sequence at a given operation
   * @param operationId included
   */
  stopWith(operationId: UID): Execution<T> {
    function* filter(execution: Iterable<ExecutionStep<T>>, operationId: UID) {
      for (const step of execution) {
        yield step;
        if (step.operation.id === operationId) {
          return;
        }
      }
    }
    return new Execution(filter(this.operations, operationId));
  }

  /**
   * Stop the operation sequence before a given operation
   * @param operationId excluded
   */
  stopBefore(operationId: UID): Execution<T> {
    function* filter(execution: Iterable<ExecutionStep<T>>, operationId: UID) {
      for (const step of execution) {
        if (step.operation.id === operationId) {
          return;
        }
        yield step;
      }
    }
    return new Execution(filter(this.operations, operationId));
  }

  /**
   * Start the operation sequence at a given operation
   * @param operationId excluded
   */
  startAfter(operationId: UID): Execution<T> {
    function* filter(execution: Iterable<ExecutionStep<T>>, operationId: UID) {
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
    return new Execution(filter(this.operations, operationId));
  }
}

export class SelectiveHistory<T = unknown> {
  private HEAD_LAYER: Layer<T> = new Layer<T>(this.buildTransformation);
  private HEAD: Operation<T>;

  /**
   * The selective history is a data structure used to register changes/updates of a state.
   * Each change/update is called an "operation".
   * The data structure allows to easily cancel (and redo) any operation individually.
   * An operation can be represented by any data structure. It can be a "command", a "diff", etc.
   * However it must have the following properties:
   * - it can be applied to modify the state
   * - it can be reverted on the state such that it was never executed.
   * - it can be transformed given other operation (Operationnal Transformation)
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
  constructor(
    initialOperationId: UID,
    private applyOperation: (data: T) => void,
    private revertOperation: (data: T) => void,
    private buildEmpty: (id: UID) => T,
    private readonly buildTransformation: TransformationFactory<T>
  ) {
    const initial = new Operation(initialOperationId, buildEmpty(initialOperationId));
    // TODOMulti initialise HEAD_LAYER with initial isntruction in constructor
    this.HEAD_LAYER.lastLayer.addOperation(initial);
    this.HEAD = initial;
  }

  /**
   * Return the operation identified by its id.
   */
  get(operationId: UID): T {
    return this.HEAD_LAYER.findOperation(operationId).operation.data;
  }

  /**
   * Append a new operation
   */
  add(operationId: UID, data: T) {
    const operation = new Operation(operationId, data);
    const { layer } = this.HEAD_LAYER.findOperation(this.HEAD.id);
    layer.insertOperation(operation, this.HEAD.id);
    this.HEAD_LAYER = this.HEAD_LAYER.lastLayer;
    this.HEAD = operation;
  }

  /**
   * Insert a new operation after a another operation.
   * Following operations will be transformed according
   * to the new operation.
   */
  insertExternal(operationId: UID, data: T, insertAfter: UID) {
    const operation = new Operation<T>(operationId, data);
    this.revertTo(insertAfter);
    // insert to layer where it first was executed!
    const layer = this.HEAD_LAYER.findOriginLayer(insertAfter);
    layer.insertOperation(operation, insertAfter);
    this.checkoutEnd();
  }

  /**
   * @param operationId operation to undo
   * @param undoId the id of the "undo operation"
   */
  undo(operationId: UID, undoId: UID) {
    const { layer, operation: operation } = this.HEAD_LAYER.findOperation(operationId);
    this.revertBefore(operationId);
    layer.branch(operation);
    this.checkoutEnd();
    const lastLayer = this.HEAD_LAYER.lastLayer;
    const undoOperation = new Operation(undoId, this.buildEmpty(undoId));
    lastLayer.addOperation(undoOperation);
    this.HEAD_LAYER = lastLayer;
    this.HEAD = undoOperation;
  }

  /**
   * @param operationId opertation to redo
   * @param redoId the if of the "redo operation"
   */
  redo(operationId: UID, redoId: UID) {
    const { operation: operation, layer } = this.HEAD_LAYER.findOperation(operationId);
    this.revertBefore(operationId);
    layer.removeNextLayer(this.buildTransformation.with(operation!.data));
    this.checkoutEnd();
    this.add(redoId, this.buildEmpty(redoId));
  }

  /**
   * Revert the state as it was *before* the given operation was executed.
   */
  private revertBefore(operationId: UID) {
    const execution = this.HEAD_LAYER.revertedExecution().stopWith(operationId);
    this.revert(execution);
  }

  /**
   * Revert the state as it was *after* the given operation was executed.
   */
  private revertTo(operationId: UID | null) {
    const execution = operationId
      ? this.HEAD_LAYER.revertedExecution().stopBefore(operationId)
      : this.HEAD_LAYER.revertedExecution();
    this.revert(execution);
  }

  /**
   * Revert an execution
   */
  private revert(execution: Execution<T>) {
    for (const { next, operation: step, isCancelled } of execution) {
      if (!isCancelled) {
        this.revertOperation(step.data);
      }
      if (next) {
        this.HEAD_LAYER = next.layer;
        this.HEAD = next.operation;
      }
    }
  }

  /**
   * TODOMulti + rename?
   */
  private checkoutEnd() {
    const operations = this.HEAD
      ? this.HEAD_LAYER.execution().startAfter(this.HEAD.id)
      : this.HEAD_LAYER.execution();
    for (const { operation: operation, layer, isCancelled } of operations) {
      if (!isCancelled) {
        this.applyOperation(operation.data);
      }
      this.HEAD = operation;
      this.HEAD_LAYER = layer;
    }
  }
}

/**
 * A layer holds a sequence of operations.
 * It can be represented as "A    B   C   D" if A, B, C and D are executed one
 * after the other.
 *
 * Layers can be "stacked" on each other and an execution path can be derived
 * from any stack of layers. The rules to derive this path is explained below.
 *
 * An operation can be cancelled/undone by inserting a new layer below
 * this operation.
 * e.g
 *    Given the layer A    B   C
 *    To undo B, a new branching layer is inserted at operation B.
 *    ```txt
 *    A   B   C   D
 *        >   C'  D'
 *    ```
 *    A new execution path can now be derived. At each operation:
 *    - if there is a lower layer, don't execute it and go to the operation below
 *    - if not, execute it and go to the operation on the right.
 *    The execution path is   A   C'    D'
 *    Operation C and D have been adatapted (transformed) in the lower layer
 *    since operation B is not executed in this branch.
 *
 * @param buildTransformation Factory to build transformations
 * @param operations initial operations
 */
class Layer<T> {
  private previous?: Layer<T>;
  private branchingOperationId?: UID;
  private next?: Layer<T>;

  constructor(
    private readonly buildTransformation: TransformationFactory<T>,
    private operations: Operation<T>[] = []
  ) {}

  /**
   * Operation ids of this layer
   */
  private get operationIds(): UID[] {
    return this.operations.map((step) => step.id);
  }

  /**
   * Last layer of the entire stack of layers.
   * TODO find a way to make it private
   */
  get lastLayer(): Layer<T> {
    return this.next ? this.next.lastLayer : this;
  }

  /**
   * Yields the sequence of operations to execute, in reverse order.
   */
  private *_revertedExecution(): Generator<Omit<ExecutionStep<T>, "next">, void, undefined> {
    let afterBranchingPoint = !!this.branchingOperationId;
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const step = this.operations[i];
      if (step.id === this.branchingOperationId) {
        afterBranchingPoint = false;
      }
      if (!afterBranchingPoint) {
        yield {
          operation: step,
          layer: this,
          isCancelled: !this.shouldExecute(step),
        };
      }
    }
    if (this.previous) {
      yield* this.previous._revertedExecution();
    }
  }

  /**
   * Yields the sequence of operations to execute
   */
  private *_execution(): Generator<Omit<ExecutionStep<T>, "next">, void, undefined> {
    for (const operation of this.operations) {
      yield {
        operation: operation,
        layer: this,
        isCancelled: !this.shouldExecute(operation),
      };
      if (operation.id === this.branchingOperationId) {
        yield* this.next?._execution() || [];
        return;
      }
    }
    if (!this.branchingOperationId) {
      yield* this.next?._execution() || [];
    }
  }

  /**
   * Return the sequence of operations from this layer
   * until the very last layer.
   */
  execution(): Execution<T> {
    return new Execution(linkNext(this._execution(), this._execution()));
  }

  /**
   * Return the sequence of operations from this layer
   * to the very first layer.
   */
  revertedExecution(): Execution<T> {
    return new Execution(linkNext(this._revertedExecution(), this._revertedExecution()));
  }

  /**
   * Check if this layer should execute the given operation.
   * i.e. If the operation is not cancelled by a branching layer.
   */
  private shouldExecute(operation: Operation<T>): boolean {
    return operation.id !== this.branchingOperationId;
  }

  /**
   * Append an operation to the end of this layer.
   * Also insert the (transfomed) operation in previous layers.
   *
   * Adding operation `D` to the last layer
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
  addOperation(operation: Operation<T>) {
    const insertAfter: string | undefined = this.operationIds[this.operationIds.length - 1];
    this.operations.push(operation);
    if (!insertAfter) {
      this.previous?.addOperation(operation);
    } else {
      this.insertPrevious(operation, insertAfter);
    }
  }

  /**
   * Create a new branching layer at the given operation.
   * This cancels the operation from the execution path.
   */
  branch(operation: Operation<T>) {
    const transformation = this.buildTransformation.without(operation.data);
    this.after(operation.id).transformed(transformation).asBranchingLayerTo(this, operation.id);
  }

  /**
   * Insert a new operation after an other operation.
   * The operation will be inserted in this layer, in next layers (transformed)
   * and in previous layers (also transformed).
   *
   * Given
   * ```txt
   *  1: A1   B1   C1
   *  2: >    B2   C2
   *  3:      >    C3
   * ```
   * Inserting D to layer 2 gives
   * ```txt
   *  1: A1   B1   C1   D1          D1 = D transformed with A1
   *  2: >    B2   C2   D     with  D  = D
   *  3:      >    C3   D2          D2 = D transformed without B2 (B2⁻¹)
   * ```
   */
  insertOperation(newOperation: Operation<T>, insertAfter: UID) {
    if (!this.operationIds.includes(insertAfter)) {
      throw new Error(
        `Cannot insert after operation ${insertAfter}: not found. Operation: ${JSON.stringify(
          newOperation.data
        )}`
      );
    }
    const { operationsBefore, operation, operationsAfter } = this.locateOperation(insertAfter);
    const transformation = this.buildTransformation.with(newOperation.data);

    this.operations = [
      ...operationsBefore,
      operation,
      newOperation,
      ...operationsAfter.map((operation) => operation.transformed(transformation)),
    ];

    this.updateNextWith(newOperation, insertAfter);
    this.insertPrevious(newOperation, insertAfter);
  }

  /**
   * Update the branching layer of this layer, either by (1) inserting the new
   * operation in it or (2) by transforming it.
   * (1) If the operation is positionned before the branching layer, the branching
   *     layer should be transformed with this operation.
   * (2) If it's positionned after, the operation should be inserted in the
   *     branching layer.
   */
  private updateNextWith(newOperation: Operation<T>, insertAfter: UID) {
    if (!this.branchingOperationId || !this.next) return;
    if (this.shouldInsertInNext(insertAfter)) {
      const { operation: branchingOperation } = this.next.findOperation(this.branchingOperationId);
      const branchingTransformation = this.buildTransformation.without(branchingOperation.data);
      const transformedOperation = newOperation.transformed(branchingTransformation, false);
      const transformationAfter = this.buildTransformation.with(transformedOperation.data);
      // If the operation is inserted after the branching operation, it should
      // be positionned first.
      if (insertAfter === this.branchingOperationId) {
        this.next.operations = [
          transformedOperation,
          ...this.next.operations.map((operation) => operation.transformed(transformationAfter)),
        ];
      } else {
        const index = this.next?.operationIds.includes(insertAfter)
          ? insertAfter
          : this.next.operationIds[this.next.operationIds.length - 1];
        const { operationsBefore, operation, operationsAfter } = this.next.locateOperation(index);
        this.next.operations = [
          ...operationsBefore,
          operation,
          transformedOperation,
          ...operationsAfter.map((operation) => operation.transformed(transformationAfter)),
        ];
      }
      this.next.updateNextWith(transformedOperation, insertAfter);
    } else {
      const transformation = this.buildTransformation.with(newOperation.data);
      this.next = this.next?.transformed(transformation);
    }
  }

  /**
   * Insert a new operation in previous layers. The operations which are
   * positionned after the inserted operations are transformed with the newly
   * inserted operations. This one is also transformed, with the branching
   * operation.
   */
  private insertPrevious(newOperation: Operation<T>, insertAfter: UID) {
    if (!this.previous) return;
    if (!this.previous.branchingOperationId) {
      throw new Error("At this point, the branchingOperationId should always be set");
    }
    const { operation: branchingOperation } = this.previous.findOperation(
      this.previous.branchingOperationId
    );
    const { operationsBefore, operation, operationsAfter } = this.previous.locateOperation(
      insertAfter
    );
    const transformation = this.previous.buildTransformation.with(branchingOperation.data);
    const transformedOperation = newOperation.transformed(transformation, false);
    const transformationAfter = this.previous.buildTransformation.with(transformedOperation.data);
    this.previous.operations = [
      ...operationsBefore,
      operation,
      transformedOperation,
      ...operationsAfter.map((operation) => operation.transformed(transformationAfter)),
    ];
    this.previous.insertPrevious(transformedOperation, insertAfter);
  }
  /**
   * Check if the given operation id should be inserted in the branching layer
   * of this layer.
   * If the given operation id is positionned before the branching operation,
   * the operation should not be inserted (the operation is already in the
   * execution). Otherwise, it should be inserted.
   */
  private shouldInsertInNext(operationToInsert: UID): boolean {
    const operationIndex = this.operationIds.findIndex((id) => id === operationToInsert);
    const branchingIndex = this.operationIds.findIndex((id) => id === this.branchingOperationId);
    return operationIndex >= branchingIndex;
  }

  /**
   * Insert this layer after a given layer
   */
  private asBranchingLayerTo(layer: Layer<T>, branchingOperationId?: UID) {
    this.previous = layer;
    layer.next = this;
    layer.branchingOperationId = branchingOperationId;
  }

  /**
   * Find the operation in the execution path.
   */
  findOperation(operationId: UID): ExecutionStep<T> {
    for (const operation of this.revertedExecution()) {
      if (operation.operation.id === operationId) {
        return operation;
      }
    }
    throw new Error(`Operation ${operationId} not found`);
  }

  /**
   * Find the layer in which the operation was first inserted.
   */
  findOriginLayer(operationId: UID): Layer<T> {
    let layer: Layer<T> | undefined = this;
    while (layer && layer.operationIds.includes(operationId)) {
      const operation = layer.operations.find((i) => i.id === operationId);
      if (operation && operation.isOriginal) {
        return layer;
      }
      layer = layer?.previous;
    }
    if (!layer) {
      throw new Error(`Origin layer of operation ${operationId} not found`);
    }
    return layer;
  }

  /**
   * Remove the layer just after this one. This un-cancels (redo) the branching
   * operation. Lower layers will be transformed accordingly.
   *
   * Given
   * ```txt
   *  1: A1   B1   C1
   *  2: >    B2   C2
   *  3:      >    C3
   * ```
   * removing the next layer of 1 gives
   *
   * ```txt
   *  1: A1   B1   C1
   *  2:      >    C3'   with  C3' = C1 transformed without B1 (B1⁻¹)
   * ```
   */
  removeNextLayer(transformation: Transformation<T>) {
    const undoLayer = this.next;
    if (!undoLayer) {
      return;
    }
    this.next = undefined;
    this.branchingOperationId = undefined;
    const last = this.operations[this.operations.length - 1];
    const index = undoLayer.operations.findIndex((operation) => operation.id === last.id);
    this.operations = this.operations.concat(
      undoLayer.operations
        .slice(index + 1)
        .map((operation) => operation.transformed(transformation))
    );
    undoLayer.next?.asBranchingLayerTo(this, undoLayer.branchingOperationId);
    undoLayer.next?.rebaseUp();
  }

  /**
   * Rebuild transformed operations of this layer based on the upper layer.
   *
   * Given the following structure:
   * ```txt
   *  1: A1   B1    C1
   *  2: >    B2    C2
   *  3:      >     C3
   * ```
   * Rebasing layer "2" gives
   * ```txt
   *  1: A1   B1    C1
   *  2: >    B2'   C2'  With  B2' = B1 transformed without A1 and C2' = C1 transformed without A1
   *  3:      >     C3'        C3' = C2' transformed without B2'
   * ```
   */
  private rebaseUp() {
    if (!this.previous?.branchingOperationId) return;
    const rebaseTransformation = this.buildTransformation.without(
      this.getPrevious(this.previous?.branchingOperationId).data
    );
    this.operations = this.operations.map((operation) =>
      this.getPrevious(operation.id).transformed(rebaseTransformation)
    );
    this.next?.rebaseUp();
  }

  /**
   * Find the operation in the previous layer
   */
  private getPrevious(operationId: UID): Operation<T> {
    const original = this.previous?.operations.find((operation) => operation.id === operationId);
    if (!original) {
      throw new Error(`Original operation ${operationId} not found`);
    }
    return original;
  }

  /**
   * Return a copy of this layer but starting after the given
   * operation.
   */
  private after(operationId: UID): Layer<T> {
    const { operationsAfter } = this.locateOperation(operationId);
    const layer = new Layer(this.buildTransformation, operationsAfter);
    this.next?.copy().asBranchingLayerTo(layer, this.branchingOperationId);
    if (layer.branchingOperationId && !layer.operationIds.includes(layer.branchingOperationId)) {
      layer.branchingOperationId = undefined;
    }
    return layer;
  }

  /**
   * Find an operation in this layer based on its id.
   * This returns the operation itself, operations which comes before it
   * and operation which comes after it.
   */
  private locateOperation(
    operationId: UID
  ): {
    operation: Operation<T>;
    operationsBefore: Operation<T>[];
    operationsAfter: Operation<T>[];
  } {
    const operationIndex = this.operations.findIndex((step) => step.id === operationId);
    if (operationIndex === -1) {
      throw new Error(`Operation ${operationId} not found`);
    }
    return {
      operation: this.operations[operationIndex],
      operationsAfter: this.operations.slice(operationIndex + 1),
      operationsBefore: this.operations.slice(0, operationIndex),
    };
  }

  /**
   * Return a new layer where the operations have been transformed
   * using the given transformation
   */
  transformed(transformation: Transformation<T>): Layer<T> {
    const layer = this.copy();
    layer.operations = this.operations.map((step) => step.transformed(transformation, false));
    this.next
      ?.copy()
      .transformed(transformation)
      .asBranchingLayerTo(layer, this.branchingOperationId!);
    return layer;
  }

  private copy(): Layer<T> {
    const layer = new Layer(this.buildTransformation, this.operations);
    layer.next = this.next;
    layer.branchingOperationId = this.branchingOperationId;
    layer.previous = this.previous;
    return layer;
  }
}
