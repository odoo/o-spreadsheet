import * as owl from "@odoo/owl";
import { Client, Session, RemoteRevisionData } from "../types/multi_users";

export class LocalSession extends owl.core.EventBus implements Session {
  private client: Client = { id: "local", name: "Local" };
  addRevision(revision: RemoteRevisionData) {
    this.trigger("revision-acknowledged", revision);
  }

  move() {}
  leave() {}
  getClient(): Client {
    return this.client;
  }
  getConnectedClients(): Set<Client> {
    return new Set();
  }
}
