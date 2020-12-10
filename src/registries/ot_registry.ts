import { Registry } from "../registry";
import { CoreCommand, CommandTypes, CoreCommandTypes } from "../types";

//------------------------------------------------------------------------------
// Operation Transform Registry
//------------------------------------------------------------------------------

export type TransformationFunction = (
  toTransform: CoreCommand,
  executed: CoreCommand
) => CoreCommand | undefined;

export class OTRegistry extends Registry<Registry<TransformationFunction>> {
  addTransformation(toTransform: CommandTypes, executed: CommandTypes, fn: TransformationFunction) {
    if (!this.content[toTransform]) {
      this.content[toTransform] = new Registry<TransformationFunction>();
    }
    this.content[toTransform][executed] = fn;
    return this;
  }

  getTransformation(
    toTransform: CoreCommandTypes,
    executed: CoreCommandTypes
  ): TransformationFunction | undefined {
    return this.content[toTransform] && this.content[toTransform][executed];
  }
}
