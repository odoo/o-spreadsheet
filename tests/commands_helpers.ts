import { Model } from "../src";
import { CommandResult } from "../src/types";

/**
 * Dispatch an "UNDO" on the model
 */
export function undo(model: Model): CommandResult {
  return model.dispatch("UNDO");
}

/**
 * Dispatch an "UNDO" on the model
 */
export function redo(model: Model): CommandResult {
  return model.dispatch("REDO");
}