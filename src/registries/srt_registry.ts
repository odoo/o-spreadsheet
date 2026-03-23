import { CoreCommand } from "../types/commands";
import { RangeAdapterFunctions } from "../types/misc";
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

type CommandAdaptRangeFunction<C extends CoreCommand> = (
  cmd: C,
  rangeAdapters: RangeAdapterFunctions
) => C;

class SpecificRangeTransformRegistry extends Registry<CommandAdaptRangeFunction<CoreCommand>> {
  add<C extends CoreCommand>(cmdType: C["type"], fn: CommandAdaptRangeFunction<C>): this {
    super.add(cmdType, fn);
    return this;
  }

  replace<C extends CoreCommand>(cmdType: C["type"], fn: CommandAdaptRangeFunction<C>): this {
    super.replace(cmdType, fn);
    return this;
  }

  get<C extends CoreCommand>(cmdType: C["type"]): CommandAdaptRangeFunction<CoreCommand> {
    return this.content[cmdType];
  }
}

export const specificRangeTransformRegistry = new SpecificRangeTransformRegistry();
