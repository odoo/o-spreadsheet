import { Plugin, signal, Signal } from "@odoo/owl";
import { CellPosition } from "../../types/misc";

interface HoveredIcon {
  id: string;
  position: CellPosition;
}

export class HoveredIconPlugin extends Plugin {
  hoveredIcon: Signal<HoveredIcon | undefined> = signal(undefined);

  setHoveredIcon(icon: HoveredIcon | undefined) {
    this.hoveredIcon.set(icon);
  }
}
