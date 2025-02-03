import { openLink } from "../helpers/links";
import { CellPosition, Getters, SpreadsheetChildEnv } from "../types";
import { Registry } from "./registry";

export interface CellClickableItem {
  condition: (position: CellPosition, getters: Getters) => boolean;
  execute: (position: CellPosition, env: SpreadsheetChildEnv, isMiddleClick?: boolean) => void;
  title?: string;
  sequence: number;
}

export const clickableCellRegistry = new Registry<CellClickableItem>();

clickableCellRegistry.add("link", {
  condition: (position: CellPosition, getters: Getters) => {
    return !!getters.getEvaluatedCell(position).link;
  },
  execute: (position: CellPosition, env: SpreadsheetChildEnv, isMiddleClick?: boolean) =>
    openLink(env.model.getters.getEvaluatedCell(position).link!, env, isMiddleClick),
  sequence: 5,
});
