import { _t } from "../translation";

export const CellErrorType = {
  NotAvailable: "#N/A",
  InvalidReference: "#REF",
  BadExpression: "#BAD_EXPR",
  CircularDependency: "#CYCLE",
  UnknownFunction: "#NAME?",
  DivisionByZero: "#DIV/0!",
  TooBigNumber: "#NUM!",
  SpilledBlocked: "#SPILL!",
  GenericError: "#ERROR",
  NullError: "#NULL!",
} as const;

export type ErrorValue = (typeof CellErrorType)[keyof typeof CellErrorType];

export const errorTypes: Set<string> = new Set(Object.values(CellErrorType));

export class EvaluationError {
  constructor(
    readonly message: string = _t("Error"),
    readonly value: string = CellErrorType.GenericError
  ) {
    this.message = message.toString();
  }
}

export class BadExpressionError extends EvaluationError {
  constructor(message = _t("Invalid expression")) {
    super(message, CellErrorType.BadExpression);
  }
}
export class CircularDependencyError extends EvaluationError {
  constructor(message = _t("Circular reference")) {
    super(message, CellErrorType.CircularDependency);
  }
}

export class InvalidReferenceError extends EvaluationError {
  constructor(message = _t("Invalid reference")) {
    super(message, CellErrorType.InvalidReference);
  }
}

export class NotAvailableError extends EvaluationError {
  constructor(message = _t("Data not available")) {
    super(message, CellErrorType.NotAvailable);
  }
}

export class UnknownFunctionError extends EvaluationError {
  constructor(message = _t("Unknown function")) {
    super(message, CellErrorType.UnknownFunction);
  }
}

export class SplillBlockedError extends EvaluationError {
  constructor(message = _t("Spill range is not empty")) {
    super(message, CellErrorType.SpilledBlocked);
  }
}

export class DivisionByZeroError extends EvaluationError {
  constructor(message = _t("Division by zero")) {
    super(message, CellErrorType.DivisionByZero);
  }
}

export class TooBigNumberError extends EvaluationError {
  constructor(message = _t("Too big number")) {
    super(message, CellErrorType.TooBigNumber);
  }
}
