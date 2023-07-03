import { toXC } from "../helpers";
import { _lt } from "../translation";

export enum CellErrorType {
  Generic = "#ERROR",
  NotAvailable = "#N/A",
  InvalidReference = "#REF",
  BadExpression = "#BAD_EXPR",
  CircularDependency = "#CYCLE",
  UnknownFunction = "#NAME?",
  Collision = "#SPILL",
  Unknown = "#DEV",
}

export type EvaluationError =
  | UnknownError
  | GenericError
  | BadExpressionError
  | CircularDependencyError
  | InvalidReferenceError
  | NotAvailableError
  | UnknownFunctionError
  | CollisionError;

export enum CellErrorLevel {
  silent = 0,
  error = 1,
}

export function isEvaluationError(error: any): error is UserError {
  return error instanceof UserError;
}

export function toError(error: unknown): EvaluationError {
  if (error instanceof UserError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new UnknownError(message);
}

class UserError extends Error {
  constructor(
    readonly type: CellErrorType,
    message: string,
    readonly logLevel: number = CellErrorLevel.error
  ) {
    super(message);
  }
}

export class UnknownError extends UserError {
  constructor(message: string) {
    message = _lt(
      "An error occurred for unknown reasons. Please report the following message:\n%s",
      message
    );
    console.log(message);
    super(CellErrorType.Unknown, message);
  }
}

export class GenericError extends UserError {
  constructor(message: string) {
    super(CellErrorType.Generic, message);
  }
}

export class BadExpressionError extends UserError {
  constructor(errorMessage: string) {
    super(CellErrorType.BadExpression, errorMessage);
  }
}

export class CircularDependencyError extends UserError {
  constructor() {
    super(CellErrorType.CircularDependency, _lt("Circular reference"));
  }
}

export class InvalidReferenceError extends UserError {
  constructor() {
    super(CellErrorType.InvalidReference, _lt("Invalid reference"));
  }
}

export class NotAvailableError extends UserError {
  constructor(errorMessage: string | undefined = undefined) {
    super(
      CellErrorType.NotAvailable,
      errorMessage || _lt("Data not available"),
      errorMessage ? CellErrorLevel.error : CellErrorLevel.silent
    );
  }
}

export class UnknownFunctionError extends UserError {
  constructor(fctName: string) {
    super(CellErrorType.UnknownFunction, _lt('Unknown function: "%s"', fctName));
  }
}

export class CollisionError extends UserError {
  constructor(col: number, row: number) {
    super(
      CellErrorType.Collision,
      _lt("Array result was not expanded because it would overwrite data in %s.", toXC(col, row))
    );
  }
}
