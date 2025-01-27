import { CoreCommand, RangeAdapter } from "../types";
import { Registry } from "./registry";

/*
 * Specific Ranges Transform Registry
 * ====================================
 *
 * This registry contains all the transformations functions to adapt commands'
 * ranges to preserve the intention of the users and consistency during a
 * collaborative session.
 *
 */

export type CommandAdaptRangeFunction<C extends CoreCommand> = (
  cmd: C,
  applyChange: RangeAdapter
) => C;

export class SpecificRangeTransformRegistry extends Registry<
  CommandAdaptRangeFunction<CoreCommand>
> {
  add<C extends CoreCommand>(cmdType: C["type"], fn: CommandAdaptRangeFunction<C>): this {
    super.add(cmdType, fn);
    return this;
  }

  get<C extends CoreCommand>(cmdType: C["type"]): CommandAdaptRangeFunction<CoreCommand> {
    return this.content[cmdType];
  }
}

export const specificRangeTransformRegistry = new SpecificRangeTransformRegistry();
