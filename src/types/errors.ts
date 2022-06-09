import { _lt } from "../translation";

export enum CellErrorType {
  NotAvailable = "#N/A",
  InvalidReference = "#REF",
  BadExpression = "#BAD_EXPR",
  CircularDependency = "#CYCLE",
  GenericError = "#ERROR",
}

export class EvaluationError extends Error {
  errorType: string;

  constructor(cellErrorType: string, message: string) {
    super(message);
    this.errorType = cellErrorType;
  }
}

export class InvalidReferenceError extends EvaluationError {
  constructor() {
    super(CellErrorType.InvalidReference, _lt("Invalid reference"));
  }
}

export class NotAvailableError extends EvaluationError {
  constructor() {
    super(CellErrorType.NotAvailable, _lt("Data not available"));
  }
}
