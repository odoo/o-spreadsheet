import { UID } from "./misc";
import { Range } from "./range";

interface AbstractCellProtectionRule {
  id: UID;
  description: string;
  type: "range" | "sheet";
}

interface RangeCellProtectionRule extends AbstractCellProtectionRule {
  type: "range";
  ranges: Range[];
}

// interface SheetCellProtectionRule extends AbstractCellProtectionRule {
//   sheetId: string;
//   excludeRanges: Range[];
// }

export type CellProtectionRule = RangeCellProtectionRule;
