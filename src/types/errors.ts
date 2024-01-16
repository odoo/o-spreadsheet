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
  constructor(message?: string, readonly value: string = CellErrorType.GenericError) {
    super(message || _t("Error"));
  }
}

export class BadExpressionError extends EvaluationError {
  constructor(message?: string) {
    super(message || _t("Invalid expression"), CellErrorType.BadExpression);
  }
}
export class CircularDependencyError extends EvaluationError {
  constructor(message?: string) {
    super(message || _t("Circular reference"), CellErrorType.CircularDependency);
  }
}

export class InvalidReferenceError extends EvaluationError {
  constructor(message?: string) {
    super(message || _t("Invalid reference"), CellErrorType.InvalidReference);
  }
}

export class NotAvailableError extends EvaluationError {
  constructor(message?: string) {
    super(message || _t("Data not available"), CellErrorType.NotAvailable);
  }
}

export class UnknownFunctionError extends EvaluationError {
  constructor(message?: string) {
    super(message || _t("Unknown function"), CellErrorType.UnknownFunction);
  }
}
