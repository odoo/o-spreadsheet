import {
  Network,
  Message,
  ClientId,
  NewMessageCallback,
  NetworkListener,
} from "../../src/types/multi_user";
import { ConflictResolver } from "../../src/helpers/conflict_resolver";

export class MockNetwork implements Network {
  private listeners: NetworkListener[] = [];
  private pendingMessages: Message[] = [];
  private isConcurrent: boolean = false;
  private conflictResolver = new ConflictResolver();
  private disconnectedClients: Record<
    ClientId,
    {
      missedMessages: Message[];
      messagesSent: Message[];
    }
  > = {};

  onNewMessage(clientId: ClientId, callback: NewMessageCallback) {
    this.listeners.push({ clientId, callback });
  }

  sendMessage(message: Message) {
    if (!this.isConnected(message.clientId)) {
      this.disconnectedClients[message.clientId].messagesSent.push(message);
    } else if (this.isConcurrent) {
      this.pendingMessages.push(message);
    } else {
      const listeners = this.peersOf(message.clientId);
      // this.keepMessageForDisconnectedClients(message);
      // this.conflictResolver.addUpdateToHistory(message.stateVector, message.updates);
      this.notifyListeners(listeners, message);
    }
  }

  concurrent(concurrentExectionCallback: () => void) {
    this.isConcurrent = true;
    concurrentExectionCallback();
    this.isConcurrent = false;

    for (let message of this.pendingMessages) {
      const listeners = this.peersOf(message.clientId);
      this.notifyListeners(listeners, message);
      // const updates = this.conflictResolver.resolveConflicts(message.stateVector, message.updates);
      // if (updates.length) {
      //   this.conflictResolver.addUpdateToHistory(message.stateVector, updates);
      //   console.log(updates);
      //   this.keepMessageForDisconnectedClients({ ...message, updates });
      // }
    }
    this.pendingMessages = [];
  }

  disconnect(clientId: ClientId) {
    if (!(clientId in this.disconnectedClients)) {
      this.disconnectedClients[clientId] = {
        missedMessages: [],
        messagesSent: [],
      };
    }
  }

  reconnect(clientId: ClientId) {
    const clientListeners = this.listeners.filter(
      ({ clientId: listenerId }) => clientId === listenerId
    )!;
    const missedMessages = this.disconnectedClients[clientId].missedMessages;
    for (let message of missedMessages) {
      for (let { callback } of clientListeners) {
        callback(message);
      }
    }
    const listeners = this.peersOf(clientId);
    const messagesSent = this.disconnectedClients[clientId].messagesSent;
    for (let message of messagesSent) {
      this.notifyListeners(listeners, message);
    }
    delete this.disconnectedClients[clientId];
  }

  private notifyListeners(listeners: NetworkListener[], message: Message) {
    const updates = this.conflictResolver.resolveConflicts(message.stateVector, message.updates);
    if (updates.length) {
      this.conflictResolver.addUpdateToHistory(message.stateVector, updates);
      listeners = listeners.filter(({ clientId }) => this.isConnected(clientId));
      // console.log(message.clientId);
      // console.log(updates);
      for (let { callback } of listeners) {
        callback(JSON.parse(JSON.stringify({ ...message, updates })));
      }
      this.keepMessageForDisconnectedClients({ ...message, updates });
    }
  }

  private keepMessageForDisconnectedClients(message: Message) {
    for (let clientId in this.disconnectedClients) {
      this.disconnectedClients[clientId].missedMessages.push(message);
    }
  }

  private isConnected(clientId: ClientId) {
    return !(clientId in this.disconnectedClients);
  }

  private peersOf(clientId: ClientId): NetworkListener[] {
    return this.listeners.filter(({ clientId: listenerId }) => clientId !== listenerId);
  }
}
