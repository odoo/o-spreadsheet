import { _t } from "../translation";

export const CellErrorType = {
  NotAvailable: "#N/A",
  InvalidReference: "#REF",
  BadExpression: "#BAD_EXPR",
  CircularDependency: "#CYCLE",
  UnknownFunction: "#NAME?",
  GenericError: "#ERROR",
} as const;

export const errorType: Set<string> = new Set(Object.values(CellErrorType));

export class EvaluationError extends Error {
  // extend FPayload
  constructor(message?: string, readonly value: string = CellErrorType.GenericError) {
    super(message || _t("Error"));
  }
}

export class BadExpressionError extends EvaluationError {
  constructor(message?: string, readonly value: string = CellErrorType.BadExpression) {
    super(message || _t("Invalid expression"));
  }
}
export class CircularDependencyError extends EvaluationError {
  constructor(message?: string, readonly value: string = CellErrorType.CircularDependency) {
    super(message || _t("Circular reference"));
  }
}

export class InvalidReferenceError extends EvaluationError {
  constructor(message?: string, readonly value: string = CellErrorType.InvalidReference) {
    super(message || _t("Invalid reference"));
  }
}

export class NotAvailableError extends EvaluationError {
  constructor(message?: string, readonly value: string = CellErrorType.NotAvailable) {
    super(message || _t("Data not available"));
  }
}

export class UnknownFunctionError extends EvaluationError {
  constructor(message?: string, readonly value: string = CellErrorType.UnknownFunction) {
    super(message || _t("Unknown function"));
  }
}
