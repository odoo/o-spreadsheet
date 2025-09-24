import { Get } from "../store_engine";
import { ClientId } from "../types";
import { SpreadsheetStore } from "./spreadsheet_store";

export class ClientFocusStore extends SpreadsheetStore {
  mutators = [
    "focusClient",
    "unfocusClient",
    "showClientTag",
    "hideClientTag",
    "jumpToClient",
  ] as const;

  private _showClientTag = false;
  private clientFocusTimeout = {};

  constructor(get: Get) {
    super(get);
    this.onDispose(() => {
      for (const clientId in this.clientFocusTimeout) {
        this.unfocusClient(clientId);
      }
    });
  }

  get focusedClients(): Set<ClientId> {
    const focused = new Set<ClientId>();
    this.model.getters.getConnectedClients().forEach((client) => {
      if (this._showClientTag || this.clientFocusTimeout[client.id] !== undefined) {
        focused.add(client.id);
      }
    });
    return focused;
  }

  jumpToClient(clientId: ClientId) {
    const client = this.model.getters.getClient(clientId);
    this.focusClient(clientId);
    if (client.position) {
      this.model.dispatch("ACTIVATE_SHEET", {
        sheetIdTo: client.position.sheetId,
        sheetIdFrom: this.getters.getActiveSheetId(),
      });
      this.model.dispatch("SCROLL_TO_CELL", { col: client.position.col, row: client.position.row });
    }
  }

  showClientTag() {
    this._showClientTag = true;
  }

  hideClientTag() {
    this._showClientTag = false;
  }

  focusClient(clientId: ClientId) {
    if (this.clientFocusTimeout[clientId]) {
      clearTimeout(this.clientFocusTimeout[clientId]);
    }
    // This call to unfocus client isn't proxyfied and doesn't trigger a render.
    // The focus will visually disappear when the next render is triggered
    this.clientFocusTimeout[clientId] = setTimeout(() => this.unfocusClient(clientId), 3000);
  }

  unfocusClient(clientId: ClientId) {
    if (this.clientFocusTimeout[clientId]) {
      clearTimeout(this.clientFocusTimeout[clientId]);
    }
    this.clientFocusTimeout[clientId] = undefined;
  }
}
