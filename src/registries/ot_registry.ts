import { Registry } from "../registry";
import { Command, CommandTypes, Getters } from "../types";

//------------------------------------------------------------------------------
// Operation Transform Registry
//------------------------------------------------------------------------------

export type TransformationFunction = (
  toTransform: Command,
  executed: Command,
  getters: Getters
) => Command[];

export class OTRegistry extends Registry<Registry<TransformationFunction>> {
  addTransformation(toTransform: CommandTypes, executed: CommandTypes, fn: TransformationFunction) {
    if (!this.content[toTransform]) {
      this.content[toTransform] = new Registry<TransformationFunction>();
    }
    this.content[toTransform][executed] = fn;
    return this;
  }

  getTransformation(
    toTransform: CommandTypes,
    executed: CommandTypes
  ): TransformationFunction | undefined {
    return this.content[toTransform] && this.content[toTransform][executed];
  }
}
