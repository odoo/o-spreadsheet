export type Validation<T, Result> = (toValidate: T) => Result | Result[];

export interface Validator<Result> {
  /**
   * Combine multiple validation functions into a single function
   * returning the list of results of every validation.
   */
  batchValidations<T>(...validations: Validation<T, Result>[]): Validation<T, Result>;

  /**
   * Combine multiple validation functions. Every validation is executed one after
   * the other. As soon as one validation fails, it stops and the cancelled reason
   * is returned.
   */
  chainValidations<T>(...validations: Validation<T, Result>[]): Validation<T, Result>;

  checkValidations<T>(
    command: T,
    ...validations: Validation<NoInfer<T>, Result>[]
  ): Result | Result[];
}
