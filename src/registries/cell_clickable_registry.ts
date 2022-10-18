import { openLink } from "../helpers/cells/link_factory";
import { Registry } from "../registry";
import { Cell, SpreadsheetChildEnv } from "../types";

interface CellClickableItem {
  condition: (cell: Cell, env: SpreadsheetChildEnv) => boolean;
  action: (cell: Cell, env: SpreadsheetChildEnv) => void;
  sequence: number;
}

export const clickableCellRegistry = new Registry<CellClickableItem>();

clickableCellRegistry.add("link", {
  condition: (cell: Cell) => cell.link !== undefined,
  action: (cell: Cell, env: SpreadsheetChildEnv) => openLink(cell.link!, env),
  sequence: 5,
});
