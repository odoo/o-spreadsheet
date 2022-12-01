import { _lt } from "../translation";

export enum CellErrorType {
  NotAvailable = "#N/A",
  InvalidReference = "#REF",
  BadExpression = "#BAD_EXPR",
  CircularDependency = "#CYCLE",
  UnknownFunction = "#NAME?",
  GenericError = "#ERROR",
}

export enum CellErrorLevel {
  silent = 0,
  error = 1,
}

export class EvaluationError extends Error {
  constructor(
    readonly errorType: string,
    message: string,
    readonly logLevel: number = CellErrorLevel.error
  ) {
    super(message);
  }
}

export class BadExpressionError extends EvaluationError {
  constructor(errorMessage: string) {
    super(CellErrorType.BadExpression, errorMessage);
  }
}

export class CircularDependencyError extends EvaluationError {
  constructor() {
    super(CellErrorType.CircularDependency, _lt("Circular reference"));
  }
}

export class InvalidReferenceError extends EvaluationError {
  constructor() {
    super(CellErrorType.InvalidReference, _lt("Invalid reference"));
  }
}

export class NotAvailableError extends EvaluationError {
  constructor(errorMessage: string | undefined = undefined) {
    super(
      CellErrorType.NotAvailable,
      errorMessage || _lt("Data not available"),
      errorMessage ? CellErrorLevel.error : CellErrorLevel.silent
    );
  }
}

export class UnknownFunctionError extends EvaluationError {
  constructor(fctName: string) {
    super(CellErrorType.UnknownFunction, _lt('Unknown function: "%s"', fctName));
  }
}
