import { BasePlugin } from "../base_plugin";
import { Command, LAYERS, Zone, GridRenderingContext, Highlight, HighlightType } from "../types/index";
import { toZone, getNextColor, isEqual, AddOpacityToColor } from "../helpers/index";
import { Mode } from "../model";

/**
 * HighlightPlugin
 */
export class HighlightPlugin extends BasePlugin {
  static modes: Mode[] = ["normal", "readonly"];
  static layers = [LAYERS.Highlights];
  static getters = ["getHighlights"];
  private highlights: Highlight[] = [];
  private color: string = "#000";
  private highlightSelectionEnabled = false;
  private pendingHighlights: Highlight[] = [];

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ADD_HIGHLIGHTS":
        this.addHighlights(cmd.ranges, cmd.highlightType);
        break;
      case "REMOVE_ALL_HIGHLIGHTS":
        this.highlights = [];
        break;
      case "REMOVE_HIGHLIGHTS":
        this.removeHighlights(cmd.ranges);
        break;
      case "SELECT_CELL":
      case "SET_SELECTION":
        if (this.highlightSelectionEnabled) {
          this.highlightSelection();
        }
        break;
      case "START_SELECTION_EXPANSION":
        this.color = getNextColor();
        break;
      case "HIGHLIGHT_SELECTION":
        this.highlightSelectionEnabled = cmd.enabled;
        if (!cmd.enabled) {
          this.dispatch("RESET_PENDING_HIGHLIGHT");
        }
        break;
      case "RESET_PENDING_HIGHLIGHT":
        this.pendingHighlights = [];
        break;
      case "ADD_PENDING_HIGHLIGHTS":
        this.addPendingHighlight(cmd.ranges, cmd.highlightType);
        break;
      case "SET_HIGHLIGHT_COLOR":
        this.color = cmd.color;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getHighlights(): Highlight[] {
    return this.highlights;
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  private addHighlights(ranges: { [range: string]: string }, highlightType: HighlightType) {
    let highlights = this.prepareHighlights(ranges, highlightType);
    this.highlights = this.highlights.concat(highlights);
  }

  private addPendingHighlight(ranges: { [range: string]: string }, highlightType: HighlightType) {
    let highlights = this.prepareHighlights(ranges, highlightType);
    this.pendingHighlights = this.pendingHighlights.concat(highlights);
  }

  private prepareHighlights(ranges: { [range: string]: string }, highlightType: HighlightType): Highlight[] {
    if (Object.keys(ranges).length === 0) {
      return [];
    }
    return Object.keys(ranges)
      .map((r1c1) => {
        const [xc, sheet] = r1c1.split("!").reverse();
        const sheetId = this.getters.getSheetIdByName(sheet) || this.getters.getActiveSheetId();
        const zone: Zone = this.getters.expandZone(toZone(xc));
        return { zone, color: ranges[r1c1], sheet: sheetId, type: highlightType };
      })
      .filter(
        (x) =>
          x.zone.top >= 0 &&
          x.zone.left >= 0 &&
          x.zone.bottom < this.getters.getSheet(x.sheet).rowNumber &&
          x.zone.right < this.getters.getSheet(x.sheet).colNumber
      );
  }

  /**
   *
   * @param ranges {"[sheet!]XC": color}
   * @private
   */
  private removeHighlights(ranges: { [range: string]: string }) {
    const activeSheetId = this.getters.getActiveSheetId();
    const rangesBySheets = {};
    for (let [range, color] of Object.entries(ranges)) {
      const [xc, sheetName] = range.split("!").reverse();
      const sheetId = this.getters.getSheetIdByName(sheetName);
      rangesBySheets[sheetId || activeSheetId] = Object.assign(
        { [xc]: color },
        rangesBySheets[sheetId || activeSheetId] || {}
      );
    }
    const shouldBeKept = (highlight: Highlight) =>
      !(
        rangesBySheets[highlight.sheet] &&
        rangesBySheets[highlight.sheet][this.getters.zoneToXC(highlight.zone)] === highlight.color
      );
    this.highlights = this.highlights.filter(shouldBeKept);
  }

  /**
   * Highlight selected zones (which are not already highlighted).
   */
  private highlightSelection() {
    this.removePendingHighlights();
    const zones = this.getters.getSelectedZones().filter((z) => !this.isHighlighted(z));
    const ranges = {};
    let color = this.color;
    for (const zone of zones) {
      ranges[this.getters.zoneToXC(zone)] = color;
      color = getNextColor();
    }
    this.dispatch("ADD_HIGHLIGHTS", { ranges, highlightType: "border" },);
    this.dispatch("ADD_PENDING_HIGHLIGHTS", { ranges, highlightType: "border" });
  }

  private isHighlighted(zone: Zone): boolean {
    return !!this.highlights.find((h) => isEqual(h.zone, zone));
  }

  /**
   * Remove pending highlights which are not selected.
   * Highlighted zones which are selected are still considered
   * pending.
   */
  private removePendingHighlights() {
    const ranges = {};
    const [selected, notSelected] = this.pendingHighlights.reduce(
      ([y, n], highlight) =>
        this.getters.isSelected(highlight.zone) ? [[...y, highlight], n] : [y, [...n, highlight]],
      [[], []]
    );
    for (const { zone, color } of notSelected) {
      ranges[this.getters.zoneToXC(zone)] = color;
    }
    this.dispatch("REMOVE_HIGHLIGHTS", { ranges });
    this.pendingHighlights = selected;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    // rendering selection highlights
    const { ctx, viewport, thinLineWidth } = renderingContext;
    ctx.lineWidth = 3 * thinLineWidth;
    for (let h of this.highlights.filter(
      (highlight) => highlight.sheet === this.getters.getActiveSheetId()
    )) {
      const [x, y, width, height] = this.getters.getRect(h.zone, viewport);
      if (width > 0 && height > 0) {
        if (h.type === "border" || h.type === "all") {
          ctx.strokeStyle = h.color!;
          ctx.strokeRect(x, y, width, height);
        }
        if (h.type === "background" || h.type === "all") {
          ctx.fillStyle = AddOpacityToColor(h.color, 0.2);
          ctx.fillRect(x, y, width, height);
        }
      }
    }
  }
}
