import { UID } from "./types";

type Transformation<T = unknown> = (dataToTransform: T) => T;

interface TransformationFactory<T = unknown> {
  /**
   * Build a transformation function to transform any command as if the execution of
   * a previous `command` was omitted.
   */
  buildTransformationWithout: (command: T) => Transformation<T>;
  /**
   * Build a transformation function to transform any command as if a new `command` was
   * executed before.
   */
  buildTransformationWith: (command: T) => Transformation<T>;
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
class Instruction {
  constructor(readonly id: UID, readonly data: unknown) {}

  transformed(transformation: Transformation): Instruction {
    return new Instruction(this.id, transformation(this.data));
  }
}

interface ExecutionStep {
  instruction: Instruction;
  layer: Layer;
  isCancelled: boolean;
  next: {
    instruction: Instruction | null;
    layer: Layer;
  };
}

class Execution implements Iterable<ExecutionStep> {
  constructor(private readonly instructions: Generator<ExecutionStep, void, undefined>) {}
  [Symbol.iterator](): Iterator<ExecutionStep, void, undefined> {
    return this.instructions;
  }

  /**
   * Stop the instruction sequence at a given instruction
   * @param instructionId included
   */
  stopWith(instructionId: UID): Execution {
    function* filter(execution: Iterable<ExecutionStep>, instructionId: UID) {
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
   * Start the instruction sequence at a given instruction
   * @param instructionId excluded
   */
  startAfter(instructionId: UID): Execution {
    function* filter(execution: Iterable<ExecutionStep>, instructionId: UID) {
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

/**
 *
 */
export class History<T = unknown> {
  private HEAD_LAYER: Layer = new Layer(); // the first layer is never deleted
  private HEAD: Instruction | null = null;

  constructor(
    private applyStep: (data) => void,
    private revertStep: (data) => void,
    private readonly transformationFactory: TransformationFactory
  ) {}

  addInstruction(id: UID, data: any) {
    const instruction = new Instruction(id, data);
    this.HEAD_LAYER.lastLayer.addInstruction(instruction);
    this.HEAD_LAYER = this.HEAD_LAYER.lastLayer;
    this.HEAD = instruction;
    this.applyStep(data); // checkout ?
  }

  undo(instructionId: UID) {
    const { layer, instruction } = this.HEAD_LAYER.findInstruction(instructionId);
    this.revertBefore(instructionId);
    layer
      .copyAfter(instructionId)
      .transformed(this.transformationFactory.buildTransformationWithout(instruction.data))
      .insertAfter(layer, instructionId);
    this.checkoutEnd();
  }

  redo(instructionId: UID) {
    const { instruction, layer } = this.HEAD_LAYER.findInstruction(instructionId);
    this.revertBefore(instructionId);
    layer.removeNextLayer(this.transformationFactory.buildTransformationWith(instruction!.data));
    this.checkoutEnd();
  }

  /**
   * Revert the state as it was before the given instruction was
   * executed.
   * @param instructionId included
   */
  private revertBefore(instructionId: UID) {
    const execution = this.HEAD_LAYER.revertedExecution().stopWith(instructionId);
    for (const { next, instruction: step, isCancelled } of execution) {
      if (!isCancelled) {
        this.revertStep(step.data);
      }
      this.HEAD_LAYER = next.layer;
      this.HEAD = next.instruction;
    }
  }

  private checkoutEnd() {
    const instructions = this.HEAD
      ? this.HEAD_LAYER.execution().startAfter(this.HEAD.id)
      : this.HEAD_LAYER.execution();
    for (const { instruction, layer, isCancelled } of instructions) {
      if (!isCancelled) {
        this.applyStep(instruction.data);
      }
      this.HEAD = instruction;
      this.HEAD_LAYER = layer;
    }
  }
}

/**
 * TODO find a name!
 * Layer doesn't mean anything!
 */
class Layer {
  private previous?: Layer;
  private branchingInstructionId?: UID;
  private next?: Layer;

  constructor(private instructions: Instruction[] = []) {}

  private get stepIds(): UID[] {
    return this.instructions.map((step) => step.id);
  }

  /** I don't like this being public */
  get lastLayer(): Layer {
    return this.next ? this.next.lastLayer : this;
  }

  /**
   * Yields the sequence of instructions to execute, in reverse order.
   */
  private *_revertedExecution(): Generator<Omit<ExecutionStep, "next">, void, undefined> {
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
  private *_execution(): Generator<Omit<ExecutionStep, "next">, void, undefined> {
    // use while?
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

  execution(): Execution {
    return new Execution(this.linkNextInstruction(this._execution(), this._execution()));
  }

  revertedExecution(): Execution {
    return new Execution(
      this.linkNextInstruction(this._revertedExecution(), this._revertedExecution())
    );
  }

  /**
   * Check if this layer should execute the given instruction.
   */
  private shouldExecute(instruction: Instruction): boolean {
    return !this.next?.executes(instruction.id) && this.isMainLayerOf(instruction.id);
  }

  /**
   * Check if this layer is the main layer of a instruction.
   * TODO: what is a "main layer" ???
   */
  private isMainLayerOf(instructionId: UID): boolean {
    return this.stepIds.includes(instructionId) && instructionId !== this.branchingInstructionId;
  }

  /**
   * Return true if this layer or lower layers execute
   * the given step.
   */
  private executes(instructionId: UID): boolean {
    return this.next?.executes(instructionId) || this.isMainLayerOf(instructionId);
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

  addInstruction(instruction: Instruction) {
    this.instructions.push(instruction);
  }

  insertAfter(upperLayer: Layer, branchingInstructionId?: UID) {
    this.previous = upperLayer;
    upperLayer.next = this;
    upperLayer.branchingInstructionId = branchingInstructionId;
  }

  findInstruction(instructionId: UID): ExecutionStep {
    for (const instruction of this.revertedExecution()) {
      if (instruction.instruction.id === instructionId) {
        return instruction;
      }
    }
    throw new Error(`Instruction ${instructionId} not found`);
  }

  removeNextLayer(transformation: Transformation) {
    const undoLayer = this.next;
    if (!undoLayer) {
      return;
    }
    this.next = undefined;
    this.branchingInstructionId = undefined;
    undoLayer.next?.transformed(transformation).insertAfter(this, undoLayer.branchingInstructionId);
  }

  /**
   * TODO
   * this is not really a copy since it moves the next layer
   * @param stepId excluded
   */
  copyAfter(stepId: UID): Layer {
    const instructionIndex = this.instructions.findIndex((step) => step.id === stepId);
    if (instructionIndex === -1) {
      throw new Error(`Step ${stepId} not found`);
    }
    const layer = new Layer(this.instructions.slice(instructionIndex + 1));
    // If there is a next, there is always a branchingStepId.
    // This should be ensured however
    // the above is not true
    this.next?.copy().insertAfter(layer, this.branchingInstructionId!);

    // manage this here?
    if (layer.branchingInstructionId && !layer.stepIds.includes(layer.branchingInstructionId)) {
      layer.branchingInstructionId = undefined;
    }
    return layer;
  }

  /**
   * Return a new layer where the instructions have been transformed
   * using the given transformation
   */
  transformed(transformation: Transformation): Layer {
    const layer = this.copy();
    layer.instructions = this.instructions.map((step) => step.transformed(transformation));
    this.next?.copy().transformed(transformation).insertAfter(layer, this.branchingInstructionId!);
    return layer;
  }

  private copy(): Layer {
    const layer = new Layer(this.instructions);
    // arf, this is null
    layer.next = this.next;
    layer.branchingInstructionId = this.branchingInstructionId;
    layer.previous = this.previous;
    return layer;
  }
}
