import { SELECTION_BORDER_COLOR } from "../constants";
import { positionToZone } from "../helpers";
import { Get } from "../store_engine";
import { GridRenderingContext, Highlight, Zone } from "../types";
import { SpreadsheetStore } from "./spreadsheet_store";

export interface HighlightProvider {
  highlights: Highlight[];
}

export class SelectionStore extends SpreadsheetStore {
  mutators = ["disable", "enable", "markSelectionToDisplay", "forgetSelectionToDisplay"] as const;

  private state: "disabled" | "enabled" = "disabled";
  scrollSelectionIntoView: boolean = false;
  constructor(get: Get) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: () => (this.state = "enabled"),
    });
  }

  disable() {
    this.state = "disabled";
  }
  enable() {
    this.state = "enabled";
  }

  // TODORAR  wth am I doing here? I want to be able to show the selection but on a very specific situation, the resize the grid
  // implied by the activation of the virtual keyboard on mobile. The current condition is false
  // roght now it'"ss horrible because we eiuter have to passw a 2 callbacks (get and set) or we have to use the store and trigger renders every time
  markSelectionToDisplay() {
    this.scrollSelectionIntoView = true;
  }

  forgetSelectionToDisplay() {
    this.scrollSelectionIntoView = false;
  }

  get isActive() {
    return this.state === "enabled";
  }

  get renderingLayers() {
    return ["Selection"] as const;
  }

  drawLayer(renderingContext: GridRenderingContext): void {
    if (this.getters.isDashboard() || this.state === "disabled") {
      return;
    }
    const { ctx, thinLineWidth } = renderingContext;
    // selection
    const zones = this.getters.getSelectedZones();
    ctx.fillStyle = "#f3f7fe";
    const onlyOneCell =
      zones.length === 1 && zones[0].left === zones[0].right && zones[0].top === zones[0].bottom;
    ctx.fillStyle = onlyOneCell ? "#f3f7fe" : "#e9f0ff";
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 1.5 * thinLineWidth;
    for (const zone of zones) {
      const { x, y, width, height } = this.getters.getVisibleRect(zone);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillRect(x, y, width, height);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeRect(x, y, width, height);
    }
    ctx.globalCompositeOperation = "source-over";

    // active zone
    const position = this.getters.getActivePosition();

    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 3 * thinLineWidth;
    let zone: Zone;
    if (this.getters.isInMerge(position)) {
      zone = this.getters.getMerge(position)!;
    } else {
      zone = positionToZone(position);
    }
    const { x, y, width, height } = this.getters.getVisibleRect(zone);
    if (width > 0 && height > 0) {
      ctx.strokeRect(x, y, width, height);
    }
  }
}