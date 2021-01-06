import { UID } from "./types";

type TransformationFunction = (data: any) => any;

const identityTransformation = (data: any) => data; // TODO remove me

interface Instruction {
  step: Step;
  layer: Layer;
  isCancelled: boolean;
  next: {
    step: Step | null;
    layer: Layer;
  };
}

type Execution = Instruction[];

// function* emptyExecution(): Generator<Instruction, void, undefined> {
//   yield* [];
// }

class Layer {
  public previous?: Layer; // TODO private
  public isCancelled = false;
  private branchingStepId?: UID;
  private next?: Layer;

  constructor(
    private transformation: TransformationFunction = identityTransformation,
    private inverseTransformation: TransformationFunction = identityTransformation,
    private steps: Step[] = []
  ) {}

  get lastStep(): Step {
    this.next; // remove
    return this.steps[this.steps.length - 1];
  }

  private *_revertedExecution(): Generator<Omit<Instruction, "next">, void, undefined> {
    let branched = !!this.branchingStepId;
    // use while?
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const currentStep = this.steps[i];
      if (!branched) {
        yield {
          step: currentStep,
          layer: this,
          isCancelled: false,
        };
      }
      if (currentStep.id === this.branchingStepId) {
        branched = false;
      }
    }
    if (this.previous) {
      yield* this.previous._revertedExecution();
    }
  }

  // TODO rename
  private *_execution(): Generator<Omit<Instruction, "next">, void, undefined> {
    // use while?
    for (const step of this.steps) {
      yield {
        step,
        layer: this,
        isCancelled: step.id === this.branchingStepId,
      };
      if (step.id === this.branchingStepId) {
        if (this.next) {
          yield* this.next?._execution();
        }
        return;
      }
    }
  }

  *execution(): Generator<Instruction, void, undefined> {
    yield* this.linkNextInstruction(this._execution(), this._execution());
  }

  // iterator/iterable instead of generator ?
  *revertedExecution(): Generator<Instruction, void, undefined> {
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
        // Typescrip does not capte bien le null :/
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
    const executionAfter: Execution = [];
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
    // if (this.steps.length) {
    //   this.lastStep.next = step;
    // }
    this.steps.push(step);
  }

  insertAfter(upperLayer: Layer, branchingStepId: UID) {
    this.previous = upperLayer;
    upperLayer.next = this;
    upperLayer.branchingStepId = branchingStepId;
  }

  findLayer(stepId: UID): Layer {
    for (const { step, layer } of this._revertedExecution()) {
      if (step.id === stepId) {
        return layer;
      }
    }
    throw new Error(`Step ${stepId} was not found in any layer`);
  }

  // findStep(stepId: UID): Step | undefined {
  //   return this.steps.find((step) => step.id === stepId);
  // }

  /**
   * TODO
   * @param stepId excluded
   */
  copyAfter(stepId: UID): Layer {
    const layer = new Layer(
      this.transformation,
      this.inverseTransformation,
      this.stepsAfter(stepId)
    );
    // If there is a next, there is always a branchingStepId.
    // This should be ensured however
    // this is mutating next!
    this.next?.insertAfter(layer, this.branchingStepId!);
    return layer;
  }

  transformed(transformation: TransformationFunction): Layer {
    const layer = new Layer(
      this.transformation,
      this.inverseTransformation,
      this.steps.map((step) => step.transformed(transformation))
    );
    // 🤔 are the transformation of `next` still valid?
    // probably not
    this.next?.transformed(transformation).insertAfter(layer, this.branchingStepId!);
    return layer;
  }

  /**
   * TODO
   * @param stepId excluded
   */
  protected stepsAfter(stepId: UID): Step[] {
    const stepIndex = this.steps.findIndex((step) => step.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step ${stepId} not found`);
    }
    return this.steps.slice(stepIndex + 1);
  }

  // /**
  //  * TODO
  //  * @param stepId excluded
  //  */
  // protected stepsBefore(stepId: UID): Step[] {
  //   const stepIndex = this.steps.findIndex((step) => step.id === stepId);
  //   if (stepIndex === -1) {
  //     throw new Error(`Step ${stepId} not found`);
  //   }
  //   return this.steps.slice(0, stepIndex);
  // }
}

class Step {
  constructor(readonly id: UID, readonly data: any, readonly nextLayer?: Layer) {}

  transformed(transformation: TransformationFunction): Step {
    return new Step(this.id, transformation(this.data));
  }
}

export class History {
  HEAD_LAYER: Layer = new Layer();
  HEAD: Step | null = null;

  constructor(private applyStep: (data) => void, private revertStep: (data) => void) {}

  addStep(id: UID, data: any) {
    const step = new Step(id, data);
    this.HEAD_LAYER.addStep(step);
    this.HEAD = step;
    this.applyStep(data); // checkout ?
  }

  undo(
    stepId: UID,
    transformation: TransformationFunction,
    inverseTransformation: TransformationFunction
  ) {
    const layer = this.HEAD_LAYER.findLayer(stepId);
    this.revertUntil(stepId);
    // const layer = this.findStepLayer(this.HEAD_LAYER, stepId);
    const newLayer = layer.copyAfter(stepId).transformed(transformation);
    newLayer.insertAfter(layer, stepId);
    this.checkoutEnd();
  }

  redo(stepId: UID) {
    const layer = this.HEAD_LAYER.findLayer(stepId);
    this.revertUntil(stepId);
    layer.isCancelled = true;
    this.checkoutEnd();
  }

  /**
   * TODO
   * @param stepId included
   */
  private revertUntil(stepId: UID) {
    const executions = this.HEAD_LAYER.invertedExecutionUntil(stepId);
    for (const execution of executions) {
      this.revertStep(execution.step.data);
      this.HEAD_LAYER = execution.next.layer;
      this.HEAD = execution.next.step;
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

  // make it better => move it to Layer?
  // private findStepLayer(layer: Layer, stepId: UID): Layer {
  //   let currentLayer: Layer | undefined = layer;
  //   let step: Step | undefined;
  //   while (currentLayer && !step) {
  //     step = currentLayer.findStep(stepId);
  //     if (!step) {
  //       currentLayer = currentLayer.previous;
  //     }
  //   }
  //   if (!step || !currentLayer) {
  //     throw new Error(`Step ${stepId} not found`);
  //   }
  //   return currentLayer;
  // }
}
