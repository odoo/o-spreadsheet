import { openLink } from "../helpers/links";
import type { CellPosition, SpreadsheetChildEnv } from "../types";
import { Registry } from "./registry";

export interface CellClickableItem {
  condition: (position: CellPosition, env: SpreadsheetChildEnv) => boolean;
  execute: (position: CellPosition, env: SpreadsheetChildEnv) => void;
  sequence: number;
}

export const clickableCellRegistry = new Registry<CellClickableItem>();

clickableCellRegistry.add("link", {
  condition: (position: CellPosition, env: SpreadsheetChildEnv) =>
    !!env.model.getters.getEvaluatedCell(position).link,
  execute: (position: CellPosition, env: SpreadsheetChildEnv) =>
    openLink(env.model.getters.getEvaluatedCell(position).link!, env),
  sequence: 5,
});
