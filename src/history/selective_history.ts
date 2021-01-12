import { UID } from "../types";

type Transformation<T = unknown> = (dataToTransform: T) => T;

interface TransformationFactory<T = unknown> {
  /**
   * Build a transformation function to transform any command as if the execution of
   * a previous `command` was omitted.
   */
  without: (command: T) => Transformation<T>;
  /**
   * Build a transformation function to transform any command as if a new `command` was
   * executed before.
   */
  with: (command: T) => Transformation<T>;
}

/**
 * An Instruction can be executed to change a data structure from state A
 * to state B.
 * It should hold the necessary data used to perform this transition.
 * It should be possible to revert the changes made by this instruction.
 *
 * In the context of o-spreadsheet, the data from an instruction would
 * be a revision (the commands are used to execute it, the `changes` are used
 * to revert it).
 */
class Instruction<T> {
  constructor(readonly id: UID, readonly data: T, public readonly isOriginal = true) {}

  transformed(transformation: Transformation<T>, isOriginal?: boolean): Instruction<T> {
    return new Instruction(
      this.id,
      transformation(this.data),
      isOriginal !== undefined ? isOriginal : this.isOriginal
    );
  }
}

interface ExecutionStep<T> {
  instruction: Instruction<T>;
  layer: Layer<T>;
  isCancelled: boolean;
  next: {
    instruction: Instruction<T>;
    layer: Layer<T>;
  };
}

// Generator or array ? what about garbage collection with arrays ?
// use arrays for now => it's simple
/**
 * An execution object is a sequence of instruction.
 */
class Execution<T> implements Iterable<ExecutionStep<T>> {
  constructor(private readonly instructions: Generator<ExecutionStep<T>, void, undefined>) {}
  [Symbol.iterator](): Iterator<ExecutionStep<T>, void, undefined> {
    return this.instructions;
  }

  /**
   * Stop the instruction sequence at a given instruction
   * @param instructionId included
   */
  stopWith(instructionId: UID): Execution<T> {
    function* filter(execution: Iterable<ExecutionStep<T>>, instructionId: UID) {
      for (const step of execution) {
        yield step;
        if (step.instruction.id === instructionId) {
          return;
        }
      }
    }
    return new Execution(filter(this.instructions, instructionId));
  }

  /**
   * Stop the instruction sequence before a given instruction
   * @param instructionId excluded
   */
  stopBefore(instructionId: UID): Execution<T> {
    function* filter(execution: Iterable<ExecutionStep<T>>, instructionId: UID) {
      for (const step of execution) {
        if (step.instruction.id === instructionId) {
          return;
        }
        yield step;
      }
    }
    return new Execution(filter(this.instructions, instructionId));
  }

  /**
   * Start the instruction sequence at a given instruction
   * @param instructionId excluded
   */
  startAfter(instructionId: UID): Execution<T> {
    function* filter(execution: Iterable<ExecutionStep<T>>, instructionId: UID) {
      let skip = true;
      for (const step of execution) {
        if (!skip) {
          yield step;
        }
        if (step.instruction.id === instructionId) {
          skip = false;
        }
      }
    }
    return new Execution(filter(this.instructions, instructionId));
  }
}

export class SelectiveHistory<T = unknown> {
  private HEAD_LAYER: Layer<T> = new Layer<T>(this.buildTransformation); // the first layer is never deleted
  private HEAD: Instruction<T>;

  /**
   * The selective history is a data structure used to register changes/updates of a state.
   * The data structure allows to easily cancel (and redo) any update individually.
   * An "update" can be represented by any data structure. It can be a "command", a "diff", etc.
   * However it must have the following properties:
   * - it can be applied to modify the state
   * - it can be reverted on the state such that it was never executed.
   * - it can be transformed given other updates (Operationnal Transformation)
   *
   * Since this data structure doesn't know anything about the state nor the structure of
   * "updates", the actual work must be performed by external functions given as parameters.
   * @param initialInstructionId
   * @param applyInstruction a function which can apply a change to the state
   * @param revertInstruction  a function which can revert a change from the state
   * @param buildEmpty  a function returning an "empty" change.
   *                    i.e a change that leaves the state unmodified once applied or reverted
   *                    (used for internal implementation)
   * @param buildTransformation Used to build transformations
   */
  constructor(
    initialInstructionId: UID,
    private applyInstruction: (data: T) => void,
    private revertInstruction: (data: T) => void,
    private buildEmpty: (id: UID) => T,
    private readonly buildTransformation: TransformationFactory<T>
  ) {
    const initial = new Instruction(initialInstructionId, buildEmpty(initialInstructionId));
    // TODOMulti initialise HEAD_LAYER with initial isntruction in constructor
    this.HEAD_LAYER.lastLayer.addInstruction(initial);
    this.HEAD = initial;
    // this.add(initialInstructionId, initial);
  }

  /**
   * Return
   */
  get(id: UID) {
    return this.HEAD_LAYER.findInstruction(id).instruction.data;
  }

  add(id: UID, data: T) {
    const instruction = new Instruction(id, data);
    const { layer } = this.HEAD_LAYER.findInstruction(this.HEAD.id);
    layer.insertInstruction(instruction, this.HEAD.id);
    this.HEAD_LAYER = this.HEAD_LAYER.lastLayer;
    this.HEAD = instruction;
  }

  insertExternal(id: UID, data: T, insertAfter: UID) {
    const instruction = new Instruction<T>(id, data);
    this.revertTo(insertAfter);
    // insert to layer where it first was executed!
    // const { layer } = this.HEAD_LAYER.findInstruction(insertAfter);
    const layer = this.HEAD_LAYER.findOriginLayer(insertAfter);
    layer.insertInstruction(instruction, insertAfter);
    this.checkoutEnd();
  }

  /**
   * @param instructionId instruction to undo
   * @param undoId the id of the "undo instruction"
   */
  undo(instructionId: UID, undoId: UID) {
    const { layer, instruction } = this.HEAD_LAYER.findInstruction(instructionId);
    this.revertBefore(instructionId);
    layer.branch(instruction);
    this.checkoutEnd();
    const lastLayer = this.HEAD_LAYER.lastLayer;
    const undoInstruction = new Instruction(undoId, this.buildEmpty(undoId));
    lastLayer.addInstruction(undoInstruction);
    this.HEAD_LAYER = lastLayer;
    this.HEAD = undoInstruction;
  }

  /**
   * TODOMulti
   * @param instructionId
   * @param redoId
   */
  redo(instructionId: UID, redoId: UID) {
    const { instruction, layer } = this.HEAD_LAYER.findInstruction(instructionId);
    this.revertBefore(instructionId);
    layer.removeNextLayer(this.buildTransformation.with(instruction!.data));
    this.checkoutEnd();
    this.add(redoId, this.buildEmpty(redoId));
  }

  /**
   * Revert the state as it was *before* the given instruction was executed.
   */
  private revertBefore(instructionId: UID) {
    const execution = this.HEAD_LAYER.revertedExecution().stopWith(instructionId);
    this.revert(execution);
  }

  /**
   * Revert the state as it was *after* the given instruction was executed.
   */
  private revertTo(instructionId: UID | null) {
    const execution = instructionId
      ? this.HEAD_LAYER.revertedExecution().stopBefore(instructionId)
      : this.HEAD_LAYER.revertedExecution();
    this.revert(execution);
  }

  /**
   * Revert an execution
   */
  private revert(execution: Execution<T>) {
    for (const { next, instruction: step, isCancelled } of execution) {
      if (!isCancelled) {
        this.revertInstruction(step.data);
      }
      this.HEAD_LAYER = next.layer;
      this.HEAD = next.instruction;
    }
  }

  /**
   * TODOMulti + rename?
   */
  private checkoutEnd() {
    const instructions = this.HEAD
      ? this.HEAD_LAYER.execution().startAfter(this.HEAD.id)
      : this.HEAD_LAYER.execution();
    for (const { instruction, layer, isCancelled } of instructions) {
      if (!isCancelled) {
        this.applyInstruction(instruction.data);
      }
      this.HEAD = instruction;
      this.HEAD_LAYER = layer;
    }
  }
}

/**
 * A layer holds a sequence of instructions.
 * It can be represented as "A    B   C   D" if A, B, C and D are executed one
 * after the other.
 *
 * Layers can be "stacked" on each other. An execution path can be derived
 * from any stack of layers. The rules to derive this path is explained below.
 *
 * An instruction can be cancelled/undone by inserting a new layer below
 * this instruction.
 * e.g
 *    Given the layer A    B   C
 *    To undo B, a new branching layer is inserted at instruction B.
 *    ```txt
 *    A   B   C   D
 *        >   C'  D'
 *    ```
 *    A new execution path can now be derived. At each instruction:
 *    - if there is a lower layer, don't execute it and go to the instruction below
 *    - if not, execute it and go to the instruction on the right.
 *    The execution path is   A   C'    D'
 *    Instruction C and D have been adatapted (transformed) in the lower layer
 *    since instruction B is not executed in this branch.
 *
 * @param buildTransformation Factory to build transformations
 * @param instructions initial instructions
 */
class Layer<T> {
  private previous?: Layer<T>;
  private branchingInstructionId?: UID;
  private next?: Layer<T>;

  constructor(
    private readonly buildTransformation: TransformationFactory<T>,
    private instructions: Instruction<T>[] = []
  ) {}

  private get instructionIds(): UID[] {
    return this.instructions.map((step) => step.id);
  }

  get lastLayer(): Layer<T> {
    return this.next ? this.next.lastLayer : this;
  }

  /**
   * Yields the sequence of instructions to execute, in reverse order.
   */
  private *_revertedExecution(): Generator<Omit<ExecutionStep<T>, "next">, void, undefined> {
    let afterBranchingPoint = !!this.branchingInstructionId;
    // use while?
    for (let i = this.instructions.length - 1; i >= 0; i--) {
      const step = this.instructions[i];
      if (step.id === this.branchingInstructionId) {
        afterBranchingPoint = false;
      }
      if (!afterBranchingPoint) {
        yield {
          instruction: step,
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
   * Yields the sequence of instructions to execute
   */
  private *_execution(): Generator<Omit<ExecutionStep<T>, "next">, void, undefined> {
    for (const instruction of this.instructions) {
      yield {
        instruction: instruction,
        layer: this,
        isCancelled: !this.shouldExecute(instruction),
      };
      if (instruction.id === this.branchingInstructionId) {
        yield* this.next?._execution() || [];
        return;
      }
    }
    if (!this.branchingInstructionId) {
      yield* this.next?._execution() || [];
    }
  }

  execution(): Execution<T> {
    return new Execution(this.linkNextInstruction(this._execution(), this._execution()));
  }

  revertedExecution(): Execution<T> {
    return new Execution(
      this.linkNextInstruction(this._revertedExecution(), this._revertedExecution())
    );
  }

  /**
   * Check if this layer should execute the given instruction.
   */
  private shouldExecute(instruction: Instruction<T>): boolean {
    return instruction.id !== this.branchingInstructionId;
  }

  private *linkNextInstruction<T>(
    generator: Generator<T>,
    nextGenerator: Generator<T>
  ): Generator<T & { next: T }> {
    nextGenerator.next();
    for (const instruction of generator) {
      const nextInstruction = nextGenerator.next();
      yield {
        ...instruction,
        // Typescript does not capte bien le null :/
        // And this is half generic: <T> but we talk about `instruction`
        next: nextInstruction.done ? { ...instruction, instruction: null } : nextInstruction.value,
      };
    }
  }

  addInstruction(instruction: Instruction<T>) {
    const insertAfter: string | undefined = this.instructionIds[this.instructionIds.length - 1];
    this.instructions.push(instruction);
    if (!insertAfter) {
      this.previous?.addInstruction(instruction);
    } else {
      this.insertPrevious(instruction, insertAfter);
    }
  }

  /**
   * Create a new branching layer at the given instruction.
   * This cancels the instruction from the execution path.
   */
  branch(instruction: Instruction<T>) {
    const transformation = this.buildTransformation.without(instruction.data);
    this.copyAfter(instruction.id).transformed(transformation).asBranchingLayerTo(this, instruction.id);
  }

  /**
   * Insert a new instruction after an other instruction.
   * The instruction will be inserted in this layer, in next layers (transformed)
   * and in previous layers (also transformed).
   *
   * Given
   * ```txt
   *  A1   B1   C1
   *  >    B2   C2
   *       >    C3
   * ```
   * Inserting D after C2 gives
   * ```txt
   *  A1   B1   C1   D1          D1 = D transformed with A1
   *  >    B2   C2   D     with  D  = D
   *       >    C3   D2          D2 = D transformed without B2 (B2⁻¹)
   * ```
   */
  insertInstruction(newInstruction: Instruction<T>, insertAfter: UID) {
    if (!this.instructionIds.includes(insertAfter)) {
      throw new Error(`Cannot insert after instruction ${insertAfter}: not found`);
    }
    const { instructionsBefore, instruction, instructionsAfter } = this.locateInstruction(
      insertAfter
    );
    const transformation = this.buildTransformation.with(newInstruction.data);

    this.instructions = [
      ...instructionsBefore,
      instruction,
      newInstruction,
      ...instructionsAfter.map((instruction) => instruction.transformed(transformation)),
    ];

    this.updateNextWith(newInstruction, insertAfter);
    this.insertPrevious(newInstruction, insertAfter);
  }

  /**
   * Update the branching layer of this layer, either by (1) inserting the new
   * instruction in it or (2) by transforming it.
   * (1) If the instruction is positionned before the branching layer, the branching
   *     layer should be transformed with this instruction.
   * (2) If it's positionned after, the instruction should be inserted in the
   *     branching layer.
   */
  private updateNextWith(newInstruction: Instruction<T>, insertAfter: UID) {
    if (!this.branchingInstructionId || !this.next) return;
    if (this.shouldInsertInNext(insertAfter)) {
      const { instruction: branchingInstruction } = this.next.findInstruction(
        this.branchingInstructionId
      );
      const branchingTransformation = this.buildTransformation.without(branchingInstruction.data);
      const transformedInstruction = newInstruction.transformed(branchingTransformation, false);
      const transformationAfter = this.buildTransformation.with(transformedInstruction.data);
      // If the instruction is inserted after the branching instruction, it should
      // be positionned first.
      if (insertAfter === this.branchingInstructionId) {
        this.next.instructions = [
          transformedInstruction,
          ...this.next.instructions.map((instruction) =>
            instruction.transformed(transformationAfter)
          ),
        ];
      } else {
        const index = this.next?.instructionIds.includes(insertAfter)
          ? insertAfter
          : this.next.instructionIds[this.next.instructionIds.length - 1];
        const { instructionsBefore, instruction, instructionsAfter } = this.next.locateInstruction(
          index
        );
        this.next.instructions = [
          ...instructionsBefore,
          instruction,
          transformedInstruction,
          ...instructionsAfter.map((instruction) => instruction.transformed(transformationAfter)),
        ];
      }
      this.next.updateNextWith(transformedInstruction, insertAfter);
    } else {
      const transformation = this.buildTransformation.with(newInstruction.data);
      this.next = this.next?.transformed(transformation);
    }
  }

  /**
   * Insert a new instruction in previous layers. The instructions which are
   * positionned after the inserted instructions are transformed with the newly
   * inserted instructions. This one is also transformed, with the branching
   * instruction.
   */
  private insertPrevious(newInstruction: Instruction<T>, insertAfter: UID) {
    if (!this.previous) return;
    if (!this.previous.branchingInstructionId) {
      throw new Error("At this point, the branchingInstructionId should always be set");
    }
    const { instruction: branchingInstruction } = this.previous.findInstruction(this.previous.branchingInstructionId);
    const { instructionsBefore, instruction, instructionsAfter } = this.previous.locateInstruction(
      insertAfter
    );
    const transformation = this.previous.buildTransformation.with(branchingInstruction.data);
    const transformedInstruction = newInstruction.transformed(transformation, false);
    const transformationAfter = this.previous.buildTransformation.with(transformedInstruction.data);
    this.previous.instructions = [
      ...instructionsBefore,
      instruction,
      transformedInstruction,
      ...instructionsAfter.map((instruction) => instruction.transformed(transformationAfter)),
    ];
    this.previous.insertPrevious(transformedInstruction, insertAfter);
  }
  /**
   * Check if the given instruction id should be inserted in the branching layer
   * of this layer.
   * If the given instruction id is positionned before the branching instruction,
   * the instruction should not be inserted (the instruction is already in the
   * execution). Otherwise, it should be inserted.
   */
  private shouldInsertInNext(instructionToInsert: UID): boolean {
    const instructionIndex = this.instructionIds.findIndex((id) => id === instructionToInsert);
    const branchingIndex = this.instructionIds.findIndex(
      (id) => id === this.branchingInstructionId
    );
    return instructionIndex >= branchingIndex;
  }

  /**
   * Insert this layer after a given layer
   */
  private asBranchingLayerTo(layer: Layer<T>, branchingInstructionId?: UID) {
    this.previous = layer;
    layer.next = this;
    layer.branchingInstructionId = branchingInstructionId;
  }

  findInstruction(instructionId: UID): ExecutionStep<T> {
    for (const instruction of this.revertedExecution()) {
      if (instruction.instruction.id === instructionId) {
        return instruction;
      }
    }
    throw new Error(`Instruction ${instructionId} not found`);
  }

  findOriginLayer(instructionId: UID): Layer<T> {
    let layer: Layer<T> | undefined = this;
    while (layer && layer.instructionIds.includes(instructionId)) {
      const instruction = layer.instructions.find((i) => i.id === instructionId);
      if (instruction && instruction.isOriginal) {
        return layer;
      }
      layer = layer?.previous;
    }
    if (!layer) {
      throw new Error(`Origin layer of instruction ${instructionId} not found`);
    }
    return layer;
  }

  /**
   *
   */
  removeNextLayer(transformation: Transformation<T>) {
    const undoLayer = this.next;
    if (!undoLayer) {
      return;
    }
    this.next = undefined;
    this.branchingInstructionId = undefined;
    const last = this.instructions[this.instructions.length - 1];
    const index = undoLayer.instructions.findIndex((instruction) => instruction.id === last.id);
    this.instructions = this.instructions.concat(
      undoLayer.instructions
        .slice(index + 1)
        .map((instruction) => instruction.transformed(transformation))
    );
    undoLayer.next?.asBranchingLayerTo(this, undoLayer.branchingInstructionId);
    undoLayer.next?.rebaseUp();
  }

  /**
   * Rebuild transformed instructions of this layer based on the upper layer.
   * TODOMulti update this
   *
   * Given the following structure:
   *  1: A1  B1
   *  2: >   B2  C2
   *  3:     >   C3
   * Rebasing layer "2" with an argument transformation T gives:
   *  1: A1  B1
   *  2: >   B2' C2'  With  B2' = B1//A1-1  C2' = C2//T
   *  3:     >   C3'        C3' = C2'//B2'-1
   *
   */
  private rebaseUp() {
    if (!this.previous?.branchingInstructionId) return;
    const B = this.getOriginal(this.previous?.branchingInstructionId);
    if (!B) {
      throw new Error("oh oh not good");
    }
    const rebaseTransformation = this.buildTransformation.without(B.data);
    this.instructions = this.instructions.map((instruction) => {
      const original = this.getOriginal(instruction.id);
      if (!original) {
        throw new Error("Don't do that");
      }
      return original.transformed(rebaseTransformation);
    });
    this.next?.rebaseUp();
  }

  private getOriginal(instructionId: UID): Instruction<T> | undefined {
    return this.previous?.instructions.find((instruction) => instruction.id === instructionId);
  }

  /**
   * TODOMulti
   * this is not really a copy since it moves the next layer
   * @param stepId excluded
   */
  private copyAfter(stepId: UID): Layer<T> {
    const { instructionsAfter } = this.locateInstruction(stepId);
    const layer = new Layer(this.buildTransformation, instructionsAfter);
    // If there is a next, there is always a branchingStepId.
    // This should be ensured however
    // the above is not true
    this.next?.copy().asBranchingLayerTo(layer, this.branchingInstructionId!);

    // manage this here?
    if (
      layer.branchingInstructionId &&
      !layer.instructionIds.includes(layer.branchingInstructionId)
    ) {
      layer.branchingInstructionId = undefined;
    }
    return layer;
  }

  private locateInstruction(
    instructionId: UID
  ): {
    instruction: Instruction<T>;
    instructionsBefore: Instruction<T>[];
    instructionsAfter: Instruction<T>[];
  } {
    const instructionIndex = this.instructions.findIndex((step) => step.id === instructionId);
    if (instructionIndex === -1) {
      throw new Error(`Instruction ${instructionId} not found`);
    }
    return {
      instruction: this.instructions[instructionIndex],
      instructionsAfter: this.instructions.slice(instructionIndex + 1),
      instructionsBefore: this.instructions.slice(0, instructionIndex),
    };
  }

  /**
   * Return a new layer where the instructions have been transformed
   * using the given transformation
   */
  transformed(transformation: Transformation<T>): Layer<T> {
    const layer = this.copy();
    layer.instructions = this.instructions.map((step) => step.transformed(transformation, false));
    this.next?.copy().transformed(transformation).asBranchingLayerTo(layer, this.branchingInstructionId!);
    return layer;
  }

  private copy(): Layer<T> {
    const layer = new Layer(this.buildTransformation, this.instructions);
    // arf, this is null
    layer.next = this.next;
    layer.branchingInstructionId = this.branchingInstructionId;
    layer.previous = this.previous;
    return layer;
  }
}
