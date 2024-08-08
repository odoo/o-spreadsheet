import { UID } from "./misc";
import { Range } from "./range";

export interface CellProtectionRule {
  id: UID;
  description: string;
  ranges: Range[];
}
