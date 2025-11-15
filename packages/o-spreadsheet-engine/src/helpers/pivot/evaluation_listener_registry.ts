import { CellPosition } from "../..";
import { Registry } from "../../registry";

export type EvaluationMessage =
  | { type: "invalidateCell"; position: CellPosition }
  | { type: "invalidateAllCells" }
  | { type: string; [key: string]: any };

export interface EvaluationListener {
  handleEvaluationMessage(message: EvaluationMessage): void;
}

export const evaluationListenerRegistry = new Registry<EvaluationListener>();
