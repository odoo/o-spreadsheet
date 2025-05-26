import { openLink } from "../helpers/links";
import { _t } from "../translation";
import { CellPosition, Getters, SpreadsheetChildEnv } from "../types";
import { Registry } from "./registry";

export interface CellClickableItem {
  condition: (position: CellPosition, getters: Getters) => boolean;
  execute: (position: CellPosition, env: SpreadsheetChildEnv, isMiddleClick?: boolean) => void;
  title?: string | ((position: CellPosition, getters: Getters) => string);
  sequence: number;
}

export const clickableCellRegistry = new Registry<CellClickableItem>();

clickableCellRegistry.add("link", {
  condition: (position: CellPosition, getters: Getters) => {
    return !!getters.getEvaluatedCell(position).link;
  },
  execute: (position: CellPosition, env: SpreadsheetChildEnv, isMiddleClick?: boolean) =>
    openLink(env.model.getters.getEvaluatedCell(position).link!, env, isMiddleClick),
  title: (position, getters) => {
    const link = getters.getEvaluatedCell(position).link;
    if (!link) return "";
    if (link.isExternal) {
      return _t("Go to url: %(url)s", { url: link.url });
    } else {
      return _t("Go to %(label)s", { label: link.label });
    }
  },
  sequence: 5,
});
