import { ApplyRangeChangeSheet, CoreCommand } from "../types";
import { Registry } from "./registry";

/*
 * Operation Value Transform Registry
 * ==================================
 *
 * This registry contains all the transformations functions to adapt on command ranges
 * to preserve the intention of the users and consistency during a collaborative
 * session.
 *
 */

export type CommandAdaptRangeFunction<C extends CoreCommand> = (
  cmd: C,
  applyChange: ApplyRangeChangeSheet
) => C;

export class OVTRegistry extends Registry<CommandAdaptRangeFunction<CoreCommand>> {
  addValue<C extends CoreCommand>(cmdType: C["type"], fn: CommandAdaptRangeFunction<C>): this {
    this.content[cmdType] = fn;
    return this;
  }

  getValues<C extends CoreCommand>(cmdType: C["type"]): CommandAdaptRangeFunction<CoreCommand> {
    return this.content[cmdType];
  }
}

export const ovtRegistry = new OVTRegistry();
