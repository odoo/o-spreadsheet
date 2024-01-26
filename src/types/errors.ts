import { _t } from "../translation";

export const CellErrorType = {
  NotAvailable: "#N/A",
  InvalidReference: "#REF",
  BadExpression: "#BAD_EXPR",
  CircularDependency: "#CYCLE",
  UnknownFunction: "#NAME?",
  GenericError: "#ERROR",
} as const;

export const errorTypes: Set<string> = new Set(Object.values(CellErrorType));

export class EvaluationError extends Error {
  constructor(message = _t("Error"), readonly value: string = CellErrorType.GenericError) {
    super(message);
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
