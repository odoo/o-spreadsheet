import { getNextColor, isEqual, toZone, zoneToXc } from "../../helpers/index";
import { Mode } from "../../model";
import { Command, GridRenderingContext, Highlight, LAYERS, Zone } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

/**
 * HighlightPlugin
 */
export class HighlightPlugin extends UIPlugin {
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
        this.addHighlights(cmd.ranges);
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
        this.addPendingHighlight(cmd.ranges);
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

  private addHighlights(ranges: { [range: string]: string }) {
    let highlights = this.prepareHighlights(ranges);
    this.highlights = this.highlights.concat(highlights);
  }

  private addPendingHighlight(ranges: { [range: string]: string }) {
    let highlights = this.prepareHighlights(ranges);
    this.pendingHighlights = this.pendingHighlights.concat(highlights);
  }

  private prepareHighlights(ranges: { [range: string]: string }): Highlight[] {
    if (Object.keys(ranges).length === 0) {
      return [];
    }
    const activeSheetId = this.getters.getActiveSheetId();
    return Object.keys(ranges)
      .map((r1c1) => {
        const [xc, sheet] = r1c1.split("!").reverse();
        const sheetId = this.getters.getSheetIdByName(sheet) || activeSheetId;
        const zone: Zone = this.getters.expandZone(activeSheetId, toZone(xc));
        return { zone, color: ranges[r1c1], sheet: sheetId };
      })
      .filter(
        (x) =>
          x.zone.top >= 0 &&
          x.zone.left >= 0 &&
          x.zone.bottom < this.getters.getSheet(x.sheet).rows.length &&
          x.zone.right < this.getters.getSheet(x.sheet).cols.length
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
        rangesBySheets[highlight.sheet][zoneToXc(highlight.zone)] === highlight.color
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
      ranges[zoneToXc(zone)] = color;
      color = getNextColor();
    }
    this.dispatch("ADD_HIGHLIGHTS", { ranges });
    this.dispatch("ADD_PENDING_HIGHLIGHTS", { ranges });
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
      ranges[zoneToXc(zone)] = color;
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
    const sheetId = this.getters.getActiveSheetId();
    const lineWidth = 3 * thinLineWidth;
    ctx.lineWidth = lineWidth;
    for (let h of this.highlights.filter((highlight) => highlight.sheet === sheetId)) {
      const [x, y, width, height] = this.getters.getRect(h.zone, viewport);
      if (width > 0 && height > 0) {
        ctx.strokeStyle = h.color!;
        ctx.strokeRect(x + lineWidth / 2, y + lineWidth / 2, width - lineWidth, height - lineWidth);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = h.color! + "20";
        ctx.fillRect(x + lineWidth, y + lineWidth, width - 2 * lineWidth, height - 2 * lineWidth);
      }
    }
  }
}
