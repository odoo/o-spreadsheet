import { ClientDisconnectedError } from "../../collaborative/session";
import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from "../../constants";
import { Client, ClientPosition, GridRenderingContext, LAYERS, UID } from "../../types";
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

interface ClientToDisplay extends Required<Client> {
  color: string;
}

export class SelectionMultiUserPlugin extends UIPlugin {
  static getters = ["getClientsToDisplay"] as const;
  static layers = [LAYERS.Selection];
  private availableColors = new Set(colors);
  private colors: Record<UID, string> = {};

  private isPositionValid(position: ClientPosition): boolean {
    return (
      position.row < this.getters.getNumberRows(position.sheetId) &&
      position.col < this.getters.getNumberCols(position.sheetId)
    );
  }

  private chooseNewColor(): string {
    if (this.availableColors.size === 0) {
      this.availableColors = new Set(colors);
    }
    const color = randomChoice([...this.availableColors.values()]);
    this.availableColors.delete(color);
    return color;
  }

  /**
   * Get the list of others connected clients which are present in the same sheet
   * and with a valid position
   */
  getClientsToDisplay(): ClientToDisplay[] {
    try {
      this.getters.getClient();
    } catch (e) {
      if (e instanceof ClientDisconnectedError) {
        return [];
      } else {
        throw e;
      }
    }
    const sheetId = this.getters.getActiveSheetId();
    const clients: ClientToDisplay[] = [];
    for (const client of this.getters.getConnectedClients()) {
      if (
        client.id !== this.getters.getClient().id &&
        client.position &&
        client.position.sheetId === sheetId &&
        this.isPositionValid(client.position)
      ) {
        const position = client.position;
        if (!this.colors[client.id]) {
          this.colors[client.id] = this.chooseNewColor();
        }
        const color = this.colors[client.id];
        clients.push({ ...client, position, color });
      }
    }
    return clients;
  }

  drawGrid(renderingContext: GridRenderingContext) {
    if (this.getters.isDashboard()) {
      return;
    }
    const { viewport, ctx, thinLineWidth } = renderingContext;
    const activeSheetId = this.getters.getActiveSheetId();
    for (const client of this.getClientsToDisplay()) {
      const { row, col } = client.position!;
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
      const color = client.color;
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
