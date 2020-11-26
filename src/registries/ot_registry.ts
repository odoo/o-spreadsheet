import { Registry } from "../registry";
import { CoreCommand, CoreCommandTypes } from "../types";

//------------------------------------------------------------------------------
// Operation Transform Registry
//------------------------------------------------------------------------------

export type TransformationFunction<U extends CoreCommandTypes, V extends CoreCommandTypes> = (
  toTransform: Extract<CoreCommand, { type: U }>,
  executed: Extract<CoreCommand, { type: V }>
) => CoreCommand | undefined;

// dispatch<T extends CommandTypes, C extends Extract<Command, { type: T }>>(
export class OTRegistry extends Registry<
  Map<CoreCommandTypes, TransformationFunction<CoreCommandTypes, CoreCommandTypes>>
> {
  addTransformation<U extends CoreCommandTypes, V extends CoreCommandTypes>(
    toTransform: U,
    executed: V,
    fn: TransformationFunction<CoreCommandTypes, CoreCommandTypes>
  ) {
    if (!this.content[toTransform]) {
      this.content[toTransform] = new Map<
        CoreCommandTypes,
        TransformationFunction<CoreCommandTypes, CoreCommandTypes>
      >();
    }
    this.content[toTransform].set(executed, fn);
    return this;
  }

  getTransformation<U extends CoreCommandTypes, V extends CoreCommandTypes>(
    toTransform: U,
    executed: V
  ): TransformationFunction<CoreCommandTypes, CoreCommandTypes> | undefined {
    return this.content[toTransform] && this.content[toTransform].get(executed);
  }
}

export const otRegistry = new OTRegistry();
