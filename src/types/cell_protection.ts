import { UID } from "./misc";
import { Range, RangeData } from "./range";

interface AbstractCellProtectionRule {
  id: UID;
  type: "range" | "sheet";
  sheetId: UID;
}

export interface RangeCellProtectionRule extends AbstractCellProtectionRule {
  type: "range";
  ranges: Range[];
}

export interface SheetCellProtectionRule extends AbstractCellProtectionRule {
  type: "sheet";
  excludeRanges: Range[];
}

export type CellProtectionRule = RangeCellProtectionRule | SheetCellProtectionRule;

export interface SerializableRangeCellProtectionRule
  extends Omit<RangeCellProtectionRule, "ranges"> {
  ranges: RangeData[];
}

export interface SerializableSheetCellProtectionRule
  extends Omit<SheetCellProtectionRule, "excludeRanges"> {
  excludeRanges: RangeData[];
}

export type SerializableCellProtectionRule =
  | SerializableRangeCellProtectionRule
  | SerializableSheetCellProtectionRule;
