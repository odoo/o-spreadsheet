import { Plugin } from "@odoo/owl";
import { UID } from "../../types/misc";
import { SheetDOMScrollInfo } from "../../types/rendering";

/**
 * Remembers the scroll position of the standalone viewports, so it can be restored
 * when a viewport is re-mounted (e.g. a carousel scrolled out of the grid viewport).
 */
export class StandaloneViewportScrollPlugin extends Plugin {
  private scrollPositions: Record<UID, SheetDOMScrollInfo> = {};

  saveScroll(viewportId: UID, scroll: SheetDOMScrollInfo) {
    this.scrollPositions[viewportId] = scroll;
  }

  getScroll(viewportId: UID): SheetDOMScrollInfo | undefined {
    return this.scrollPositions[viewportId];
  }
}
