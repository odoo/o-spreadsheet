import type { CommandResult } from "./commands";
import type { Validation } from "./misc";

export interface Validator {
  /**
   * Combine multiple validation functions into a single function
   * returning the list of result of every validation.
   */
  batchValidations<T>(...validations: Validation<T>[]): Validation<T>;

  /**
   * Combine multiple validation functions. Every validation is executed one after
   * the other. As soon as one validation fails, it stops and the cancelled reason
   * is returned.
   */
  chainValidations<T>(...validations: Validation<T>[]): Validation<T>;

  checkValidations<T>(command: T, ...validations: Validation<T>[]): CommandResult | CommandResult[];
}
