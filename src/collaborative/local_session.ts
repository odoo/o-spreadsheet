import { EventBus } from "../helpers/event_bus";
import { Client, Session, RemoteRevisionData, CollaborativeEvent } from "../types/multi_users";

export class LocalSession extends EventBus<CollaborativeEvent> implements Session {
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
