import { _t } from "../translation";

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
    message: string,
    readonly errorType: string = CellErrorType.GenericError,
    readonly logLevel: number = CellErrorLevel.error
  ) {
    super(message);
  }

  get isVerbose(): boolean {
    return this.logLevel > CellErrorLevel.silent;
  }
}

export class BadExpressionError extends EvaluationError {
  constructor(errorMessage: string) {
    super(errorMessage, CellErrorType.BadExpression);
  }
}

export class CircularDependencyError extends EvaluationError {
  constructor() {
    super(_t("Circular reference"), CellErrorType.CircularDependency);
  }
}

export class InvalidReferenceError extends EvaluationError {
  constructor() {
    super(_t("Invalid reference"), CellErrorType.InvalidReference);
  }
}

export class NotAvailableError extends EvaluationError {
  constructor(errorMessage: string | undefined = undefined) {
    super(
      errorMessage || _t("Data not available"),
      CellErrorType.NotAvailable,
      errorMessage ? CellErrorLevel.error : CellErrorLevel.silent
    );
  }
}

export class UnknownFunctionError extends EvaluationError {
  constructor(fctName: string) {
    super(_t('Unknown function: "%s"', fctName), CellErrorType.UnknownFunction);
  }
}
