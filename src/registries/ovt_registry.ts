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
  add<C extends CoreCommand>(cmdType: C["type"], fn: CommandAdaptRangeFunction<C>): this {
    super.add(cmdType, fn);
    return this;
  }

  get<C extends CoreCommand>(cmdType: C["type"]): CommandAdaptRangeFunction<CoreCommand> {
    return this.content[cmdType];
  }
}

export const ovtRegistry = new OVTRegistry();
