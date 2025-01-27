import { CoreCommand } from "../types";
import { Registry } from "./registry";

/*
 * Operation Value Transform Registry
 * ============================
 *
 * This registry contains all the transformations functions to apply on command values
 * to preserve the intention of the users and consistency during a collaborative
 * session.
 *
 * First, here is an example of why it is needed.
 * Initial state: empty sheet, with Alice and Bob doing collaboration.
 * In the same state (empty sheet):
 *   - Alice add a column before the column A
 *   - Bob add a text in B1
 *
 * The two commands are transmitted to the server, which will order them.
 * Suppose the command of Alice is the first one, and Bob the second one.
 *
 * The intention of Bob is to set a text in B1, which has become the cell C1 after
 * the insertion of the column before A. So, we need to apply a transformation on
 * the command of Bob (move the column by 1 to the right, the cell becomes C1)
 *
 *
 * For all Core commands, a transformation function should be written for all
 * core commands. In practice, the transformations are very similar:
 *  - Checking the sheet on which the command is triggered
 *  - Adapting coord, zone, target with structure manipulation commands (remove, add cols and rows, ...)
 *
 * If a command should be skipped (insert a text in a deleted sheet), the
 * transformation function should return undefined.
 */

type OVTCoreCommandValueType = string[] | string | Range[] | Range;

type CoreCommandValue = {
  value?: OVTCoreCommandValueType;
  path: CoreCommandValue;
};

export interface OTVRegistery {
  addValue<C extends CoreCommand, V extends keyof C>(cmdType: C["type"], value: V): this;

  addValue<C extends CoreCommand, P0 extends keyof C, V extends keyof P0>(
    cmdType: C["type"],
    p0: P0,
    value: V
  ): this;

  addValue<C extends CoreCommand, P0 extends keyof C, P1 extends keyof P0, V extends keyof P1>(
    cmdType: C["type"],
    p0: P0,
    p1: P1,
    value: V
  ): this;

  addValue<
    C extends CoreCommand,
    P0 extends keyof C,
    P1 extends keyof P0,
    P2 extends keyof P1,
    V extends keyof P2
  >(
    cmdType: C["type"],
    p0: P0,
    p1: P1,
    p2: P2,
    value: V
  ): this;
}

export class OVTRegistry extends Registry<CoreCommandValue> implements OTVRegistery {
  addValue(cmdType, ...path): this {
    return this;
  }
  /**
   * Get the transformation function to transform the command toTransform, after
   * that the executed command happened.
   */
}

export const ovtRegistry = new OVTRegistry();
