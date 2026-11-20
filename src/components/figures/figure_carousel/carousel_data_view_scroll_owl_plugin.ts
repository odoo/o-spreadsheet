import { OwlPluginWithModel } from "../../../owl_plugins/owl_plugin_with_model";
import { Command } from "../../../types/commands";
import { UID } from "../../../types/misc";
import { SheetDOMScrollInfo } from "../../../types/rendering";

// Scroll of each carousel's active data view, reset when the active item changes.
export class CarouselDataViewScrollPlugin extends OwlPluginWithModel {
  private scrollPositions: Record<UID, SheetDOMScrollInfo> = {};

  protected handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_CAROUSEL_ACTIVE_ITEM":
      case "DELETE_FIGURE":
        delete this.scrollPositions[cmd.figureId];
        break;
    }
  }

  saveScroll(figureId: UID, scroll: SheetDOMScrollInfo) {
    this.scrollPositions[figureId] = scroll;
  }

  getScroll(figureId: UID): SheetDOMScrollInfo | undefined {
    return this.scrollPositions[figureId];
  }
}
