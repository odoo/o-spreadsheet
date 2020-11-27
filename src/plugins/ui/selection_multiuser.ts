import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from "../../constants";
import { Mode } from "../../model";
import { ClientPosition, GridRenderingContext, LAYERS, UID } from "../../types";
import { UIPlugin } from "../ui_plugin";

function randomChoice(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const colors = [
  "#ff851b",
  "#0074d9",
  "#7fdbff",
  "#b10dc9",
  "#39cccc",
  "#f012be",
  "#3d9970",
  "#111111",
  "#ff4136",
  "#aaaaaa",
  "#85144b",
  "#001f3f",
];

export class SelectionMultiUserPlugin extends UIPlugin {
  static getters = ["getClientColor"];
  static layers = [LAYERS.Selection];
  static modes: Mode[] = ["normal", "readonly"];
  private availableColors = new Set(colors);
  private colors: Record<UID, string> = {};

  private isPositionValid(position: ClientPosition): boolean {
    const sheet = this.getters.getSheet(position.sheetId);
    return position.row <= sheet.rows.length && position.col <= sheet.cols.length;
  }

  private chooseNewColor(): string {
    if (this.availableColors.size === 0) {
      this.availableColors = new Set(colors);
    }
    const color = randomChoice([...this.availableColors.values()]);
    this.availableColors.delete(color);
    return color;
  }

  getClientColor(id: UID): string {
    if (!this.colors[id]) {
      this.colors[id] = this.chooseNewColor();
    }
    return this.colors[id];
  }

  drawGrid(renderingContext: GridRenderingContext) {
    const { viewport, ctx, thinLineWidth } = renderingContext;
    const activeSheetId = this.getters.getActiveSheetId();
    for (const client of this.getters.getConnectedClients()) {
      if (
        client.id === this.getters.getClient().id ||
        !client.position ||
        client.position.sheetId !== activeSheetId ||
        !this.isPositionValid(client.position)
      ) {
        continue;
      }
      const { row, col } = client.position;
      const zone = this.getters.expandZone(activeSheetId, {
        top: row,
        bottom: row,
        left: col,
        right: col,
      });
      const [x, y, width, height] = this.getters.getRect(zone, viewport);
      if (width <= 0 || height <= 0) {
        continue;
      }
      const color = this.getClientColor(client.id);
      /* Cell background */
      const cellBackgroundColor = `${color}10`;
      ctx.fillStyle = cellBackgroundColor;
      ctx.lineWidth = 4 * thinLineWidth;
      ctx.strokeStyle = color;
      ctx.globalCompositeOperation = "multiply";
      ctx.fillRect(x, y, width, height);
      /* Cell border */
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeRect(x, y, width, height);
      /* client name background */
      ctx.font = `bold ${DEFAULT_FONT_SIZE + 1}px ${DEFAULT_FONT}`;
    }
  }
}
