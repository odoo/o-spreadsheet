import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { CellPosition } from "../../types/misc";

interface HoveredIcon {
  id: string;
  position: CellPosition;
}

export class HoveredIconStore extends SpreadsheetStore {
  mutators = ["setHoveredIcon"] as const;
  hoveredIcon: HoveredIcon | undefined = undefined;

  setHoveredIcon(icon: HoveredIcon | undefined) {
    this.hoveredIcon = icon;
  }
}
