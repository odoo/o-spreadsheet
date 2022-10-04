import { LinkCell } from "../helpers/cells";
import { Registry } from "../registry";
import { Cell, SpreadsheetChildEnv } from "../types";

interface CellClickableItem {
  condition: (cell: Cell) => boolean;
  action: (cell: Cell, env: SpreadsheetChildEnv) => void;
  sequence: number;
}

export const clickableCellRegistry = new Registry<CellClickableItem>();

clickableCellRegistry.add("link", {
  condition: (cell: Cell) => cell.isLink(),
  action: (cell: Cell, env: SpreadsheetChildEnv) => {
    (cell as LinkCell).action(env);
  },
  sequence: 5,
});
