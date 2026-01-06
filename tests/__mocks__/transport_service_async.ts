import { CollaborationMessage } from "@odoo/o-spreadsheet-engine/types/collaborative/transport_service";
import { MockTransportService } from "./transport_service";

export class MockTransportServiceAsync extends MockTransportService {
  async notifyListeners(message: CollaborationMessage) {
    return Promise.all(
      this.listeners.map(({ callback }) => {
        return Promise.resolve().then((x) => callback(message));
      })
    );
  }
}
