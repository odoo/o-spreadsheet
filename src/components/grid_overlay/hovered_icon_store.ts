import { SpreadsheetStore } from "../../stores";
import { CellPosition } from "../../types";

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
