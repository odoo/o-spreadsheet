import { CoreCommand, CoreCommandTypes } from "../types";
import { Registry } from "./registry";

/*
 * Operation Transform Registry
 * ============================
 *
 * This registry contains all the transformations functions to apply on commands
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

export type TransformationFunction<U extends CoreCommandTypes, V extends CoreCommandTypes> = (
  toTransform: Extract<CoreCommand, { type: U }>,
  executed: Extract<CoreCommand, { type: V }>
) => CoreCommand | undefined;

export class OTRegistry extends Registry<
  Map<CoreCommandTypes, TransformationFunction<CoreCommandTypes, CoreCommandTypes>>
> {
  /**
   * Add a transformation function to the registry. When the executed command
   * happened, all the commands in toTransforms should be transformed using the
   * transformation function given
   */
  addTransformation<U extends CoreCommandTypes, V extends CoreCommandTypes>(
    executed: U,
    toTransforms: V[],
    fn: TransformationFunction<CoreCommandTypes, CoreCommandTypes>
  ): this {
    for (let toTransform of toTransforms) {
      if (!this.content[toTransform]) {
        this.content[toTransform] = new Map<
          CoreCommandTypes,
          TransformationFunction<CoreCommandTypes, CoreCommandTypes>
        >();
      }
      this.content[toTransform].set(executed, fn);
    }
    return this;
  }

  /**
   * Get the transformation function to transform the command toTransform, after
   * that the executed command happened.
   */
  getTransformation<U extends CoreCommandTypes, V extends CoreCommandTypes>(
    toTransform: U,
    executed: V
  ): TransformationFunction<CoreCommandTypes, CoreCommandTypes> | undefined {
    return this.content[toTransform] && this.content[toTransform].get(executed);
  }
}

export const otRegistry = new OTRegistry();
