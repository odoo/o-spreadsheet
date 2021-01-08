import { UID } from "./types";

type TransformationFunction<T = unknown> = (dataToTransform: T) => T;

const identityTransformation: TransformationFunction = (dataToTransform: any) => dataToTransform; // TODO remove me

interface TransformationFactory<T = unknown> {
  /**
   * Build a transformation function to transform any command as if the execution of
   * a previous `command` was omitted.
   */
  buildTransformationWithout: (command: T) => TransformationFunction<T>;
  /**
   * Build a transformation function to transform any command as if a new `command` was
   * executed before.
   */
  buildTransformationWith: (command: T) => TransformationFunction<T>;
}

interface Instruction {
  step: Step;
  layer: Layer;
  isCancelled: boolean;
  next: {
    step: Step | null;
    layer: Layer;
  };
}

type Execution = Iterable<Instruction>;

class Layer {
  public previous?: Layer; // TODO private
  private branchingStepId?: UID;
  private next?: Layer;
  private isDeleted = false; // TODO rename

  constructor(private inverseTransformation: TransformationFunction, private steps: Step[] = []) {}

  private get stepIds(): UID[] {
    return this.steps.map((step) => step.id);
  }

  // TODO naming is not good
  // get lastStep(): Step {
  //   this.next; // remove
  //   return this.steps[this.steps.length - 1];
  // }

  // get cancelledStep(): Step {
  //   // TODO optional previous only make sense for the first layer
  //   return this.previous?.steps.find((step) => step.id === this.previous?.branchingStepId)!
  // }

  /** I don't like this being public */
  get lastLayer(): Layer {
    return this.next ? this.next.lastLayer : this;
  }

  private *_revertedExecution(): Generator<Omit<Instruction, "next">, void, undefined> {
    if (this.isDeleted) {
      yield* this.previous?._revertedExecution() || [];
      return;
    }
    let afterBranchingPoint = !!this.branchingStepId;
    // use while?
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const step = this.steps[i];
      if (step.id === this.branchingStepId) {
        afterBranchingPoint = false;
      }
      if (!afterBranchingPoint) {
        yield {
          step,
          layer: this,
          isCancelled: !this.shouldExecute(step.id),
        };
      }
    }
    if (this.previous) {
      yield* this.previous._revertedExecution();
    }
  }

  // TODO rename
  private *_execution(): Generator<Omit<Instruction, "next">, void, undefined> {
    if (this.isDeleted) {
      yield* this.next?._execution() || [];
      return;
    }
    // use while?
    for (const step of this.steps) {
      yield {
        step,
        layer: this,
        isCancelled: !this.shouldExecute(step.id),
      };
      if (step.id === this.branchingStepId) {
        yield* this.next?._execution() || [];
        return;
      }
    }
    if (!this.branchingStepId) {
      yield* this.next?._execution() || [];
    }
  }

  /**
   * TODO
   */
  private shouldExecute(stepId: UID): boolean {
    return (
      !this.next?.executes(stepId) &&
      !this.isDeleted &&
      this.stepIds.includes(stepId) &&
      (stepId !== this.branchingStepId || !!this.next?.isDeleted)
    );
    // return this.stepIds.includes(stepId)
    // && (stepId !== this.branchingStepId || !!this.next?.isDeleted)
    // && ((!this.next && !this.isDeleted) || !this.next?.shouldExecute(stepId))
  }

  // private isShadowed(stepId: UID) {

  // }

  /**
   * Return true if this layer or lower layers execute
   * the given step.
   */
  private executes(stepId: UID) {
    return (
      this.next?.executes(stepId) ||
      (!this.isDeleted &&
        this.stepIds.includes(stepId) &&
        (stepId !== this.branchingStepId || !!this.next?.isDeleted))
    );
  }

  *execution(): Generator<Instruction, void, undefined> {
    yield* this.linkNextInstruction(this._execution(), this._execution());
  }

  // iterator/iterable instead of generator ?
  private *revertedExecution(): Generator<Instruction, void, undefined> {
    yield* this.linkNextInstruction(this._revertedExecution(), this._revertedExecution());
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
        // And this is half generic: <T> but we talk about `step`
        next: nextInstruction.done ? { ...instruction, step: null } : nextInstruction.value,
      };
    }
  }

  /**
   * TODO
   * @param stepId Included
   */
  invertedExecutionUntil(stepId: UID): Execution {
    const revertedExecution = this.revertedExecution();
    const execution: Instruction[] = [];
    for (const step of revertedExecution) {
      execution.push(step);
      if (step.step.id === stepId) {
        return execution;
      }
    }
    return execution;
  }

  /**
   * TODO
   * @param stepId excluded
   */
  executionAfter(stepId: UID): Execution {
    const executionAfter: Instruction[] = [];
    const execution = this.execution();
    let nextInstruction = execution.next();
    while (!nextInstruction.done && nextInstruction.value.step.id !== stepId) {
      nextInstruction = execution.next();
    }
    for (const instruction of execution) {
      executionAfter.push(instruction);
    }
    return executionAfter;
  }

  addStep(step: Step) {
    this.steps.push(step);
  }

  insertAfter(upperLayer: Layer, branchingStepId?: UID) {
    // don't insert If empty?
    this.previous = upperLayer;
    upperLayer.next = this;
    upperLayer.branchingStepId = branchingStepId;
  }

  findInstruction(stepId: UID): Instruction {
    for (const instruction of this.revertedExecution()) {
      if (instruction.step.id === stepId) {
        return instruction;
      }
    }
    throw new Error(`Step ${stepId} not found`);
  }

  findLayer(stepId: UID): Layer {
    for (const { step, layer } of this._revertedExecution()) {
      if (step.id === stepId) {
        return layer;
      }
    }
    throw new Error(`Step ${stepId} was not found in any layer`);
  }

  findUndoLayer(stepId: UID): Layer | undefined {
    return this.findLayer(stepId).next;
  }

  delete() {
    this.isDeleted = true;
    // // transform
    // const lastLayer = this.lastLayer;
    // lastLayer.transformed(this.inverseTransformation).insertAfter(lastLayer);
  }

  /**
   * TODO
   * this is not really a copy since it moves the next layer
   * @param stepId excluded
   */
  copyAfter(stepId: UID): Layer {
    const layer = new Layer(this.inverseTransformation, this.stepsAfter(stepId));
    // If there is a next, there is always a branchingStepId.
    // This should be ensured however
    // the above is not true
    this.next?.copy().insertAfter(layer, this.branchingStepId!);

    // should not be managed here
    if (layer.branchingStepId && !layer.stepIds.includes(layer.branchingStepId)) {
      layer.branchingStepId = undefined;
    }
    return layer;
  }

  transformed(transformation: TransformationFunction): Layer {
    // const layer = new Layer(
    //   this.inverseTransformation, // ?
    //   this.steps.map((step) => step.transformed(transformation))
    // );
    const layer = this.copy();
    layer.steps = this.steps.map((step) => step.transformed(transformation));
    // 🤔 are the transformation of `next` still valid?
    // probably not
    this.next?.copy().transformed(transformation).insertAfter(layer, this.branchingStepId!);
    return layer;
  }

  private copy(): Layer {
    const layer = new Layer(this.inverseTransformation, this.steps);
    // arf, this is null
    layer.next = this.next;
    layer.branchingStepId = this.branchingStepId;
    layer.isDeleted = this.isDeleted;
    layer.previous = this.previous;
    return layer;
  }

  /**
   * TODO
   * @param stepId excluded
   */
  private stepsAfter(stepId: UID): Step[] {
    const stepIndex = this.steps.findIndex((step) => step.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step ${stepId} not found`);
    }
    return this.steps.slice(stepIndex + 1);
  }
}

class Step {
  constructor(readonly id: UID, readonly data: any, readonly nextLayer?: Layer) {}

  transformed(transformation: TransformationFunction): Step {
    // Hmm 🤔 inverse still valid ?
    return new Step(this.id, transformation(this.data));
  }
}

export class History {
  private HEAD_LAYER: Layer = new Layer(identityTransformation); // the first layer is never redone
  private HEAD: Step | null = null;

  constructor(
    private applyStep: (data) => void,
    private revertStep: (data) => void,
    private readonly transformationFactory: TransformationFactory
  ) {}

  addStep(id: UID, data: any) {
    const step = new Step(id, data);
    this.HEAD_LAYER.lastLayer.addStep(step);
    this.HEAD_LAYER = this.HEAD_LAYER.lastLayer;
    this.HEAD = step;
    this.applyStep(data); // checkout ?
  }

  undo(stepId: UID) {
    const { layer, step } = this.HEAD_LAYER.findInstruction(stepId);
    this.revertBefore(stepId);
    layer
      .copyAfter(stepId)
      .transformed(this.transformationFactory.buildTransformationWithout(step.data))
      .insertAfter(layer, stepId);
    this.checkoutEnd();
  }

  redo(stepId: UID) {
    const layer = this.HEAD_LAYER.findUndoLayer(stepId);
    const { step } = this.HEAD_LAYER.findInstruction(stepId);
    if (!layer) {
      throw new Error(`Step ${stepId} cannot be redone since it was never undone`);
    }
    const currentLayer = this.HEAD_LAYER.lastLayer; // this may not be the last layer! (the last layer might be empty)
    this.revertBefore(stepId);
    currentLayer
      .transformed(this.transformationFactory.buildTransformationWith(step.data))
      .insertAfter(currentLayer);
    layer.delete();
    this.checkoutEnd();
  }

  /**
   * TODO
   * @param stepId included
   */
  private revertBefore(stepId: UID) {
    const execution = this.HEAD_LAYER.invertedExecutionUntil(stepId);
    for (const { next, step, isCancelled } of execution) {
      if (!isCancelled) {
        this.revertStep(step.data);
      }
      this.HEAD_LAYER = next.layer;
      this.HEAD = next.step;
    }
  }

  private checkoutEnd() {
    const steps = this.HEAD
      ? this.HEAD_LAYER.executionAfter(this.HEAD.id)
      : this.HEAD_LAYER.execution();
    for (const { step, layer, isCancelled } of steps) {
      if (!isCancelled) {
        this.applyStep(step.data);
      }
      this.HEAD = step;
      this.HEAD_LAYER = layer;
    }
  }
}
