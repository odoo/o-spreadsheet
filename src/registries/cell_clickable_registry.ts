import { openLink } from "../helpers/links";
import { CellPosition, Getters, SpreadsheetChildEnv, Style, Zone } from "../types";
import { Registry } from "./registry";

export interface CellClickableItem {
  condition: (position: CellPosition, getters: Getters) => boolean;
  execute: (position: CellPosition, env: SpreadsheetChildEnv, isMiddleClick?: boolean) => void;
  hoverStyle?: (position: CellPosition, getters: Getters) => ClickableCellHoverStyle[];
  title?: string;
  sequence: number;
}

interface ClickableCellHoverStyle {
  zone: Zone;
  style: Style;
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
