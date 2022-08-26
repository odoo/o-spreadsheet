import { openLink } from "../helpers/links";
import { Registry } from "../registry";
import { CellPosition, SpreadsheetChildEnv } from "../types";

interface CellClickableItem {
  condition: (position: CellPosition, env: SpreadsheetChildEnv) => boolean;
  action: (position: CellPosition, env: SpreadsheetChildEnv) => void;
  sequence: number;
}

export const clickableCellRegistry = new Registry<CellClickableItem>();

clickableCellRegistry.add("link", {
  condition: (position: CellPosition, env: SpreadsheetChildEnv) =>
    !!env.model.getters.getEvaluatedCell(position).link,
  action: (position: CellPosition, env: SpreadsheetChildEnv) =>
    openLink(env.model.getters.getEvaluatedCell(position).link!, env),
  sequence: 5,
});
