import { _t } from "../translation";
import { CellErrorType } from "../types/errors";
import { Registry } from "./registry";

export const evaluationErrorRegistry = new Registry<string>();

evaluationErrorRegistry.add(CellErrorType.GenericError, _t("Error"));
evaluationErrorRegistry.add(CellErrorType.InvalidReference, _t("Invalid reference"));
evaluationErrorRegistry.add(CellErrorType.BadExpression, _t("Invalid expression"));
evaluationErrorRegistry.add(CellErrorType.UnknownFunction, _t("Unknown function"));
evaluationErrorRegistry.add(CellErrorType.CircularDependency, _t("Circular reference"));
evaluationErrorRegistry.add(CellErrorType.NotAvailable, _t("Data not available"));
