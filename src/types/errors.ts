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
    readonly errorType: string,
    message: string,
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
    super(CellErrorType.BadExpression, errorMessage);
  }
}

export class CircularDependencyError extends EvaluationError {
  constructor() {
    super(CellErrorType.CircularDependency, _t("Circular reference"));
  }
}

export class InvalidReferenceError extends EvaluationError {
  constructor() {
    super(CellErrorType.InvalidReference, _t("Invalid reference"));
  }
}

export class NotAvailableError extends EvaluationError {
  constructor(errorMessage: string | undefined = undefined) {
    super(
      CellErrorType.NotAvailable,
      errorMessage || _t("Data not available"),
      errorMessage ? CellErrorLevel.error : CellErrorLevel.silent
    );
  }
}

export class UnknownFunctionError extends EvaluationError {
  constructor(fctName: string) {
    super(CellErrorType.UnknownFunction, _t('Unknown function: "%s"', fctName));
  }
}
