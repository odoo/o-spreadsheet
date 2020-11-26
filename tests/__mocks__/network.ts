import {
  Network,
  NetworkListener,
  Message,
  ClientId,
  NewMessageCallback,
} from "../../src/types/multi_users";
import { nextTick } from "../helpers";

export class MockNetwork implements Network {
  private listeners: NetworkListener[] = [];
  private pendingMessages: Message[] = [];
  private isConcurrent: boolean = false;
  // private disconnectedClients: Record<
  //   ClientId,
  //   {
  //     missedMessages: Message[];
  //     messagesSent: Message[];
  //   }
  // > = {};
  private timestamp: number = 1;

  async getTicket() {
    return this.timestamp++;
  }

  onNewMessage(clientId: ClientId, callback: NewMessageCallback) {
    this.listeners.push({ clientId, callback });
  }

  sendMessage(message: Message) {
    // console.log(message);
    // if (!this.isConnected(message.clientId)) {
    //   this.disconnectedClients[message.clientId].messagesSent.push(message);
    // } else if (this.isConcurrent) {
    if (this.isConcurrent) {
      this.pendingMessages.push(message);
    } else {
      // this.keepMessageForDisconnectedClients(message);
      // this.conflictResolver.addUpdateToHistory(message.stateVector, message.updates);
      this.notifyListeners(this.listeners, message);
    }
  }

  async concurrent(concurrentExectionCallback: () => void) {
    this.isConcurrent = true;
    concurrentExectionCallback();
    await nextTick();
    this.isConcurrent = false;
    // console.table(this.pendingMessages);
    for (let message of this.pendingMessages) {
      // console.log("********************");
      // console.log(message);
      this.notifyListeners(this.listeners, message);
      // const updates = this.conflictResolver.resolveConflicts(message.stateVector, message.updates);
      // if (updates.length) {
      //   this.conflictResolver.addUpdateToHistory(message.stateVector, updates);
      //   console.log(updates);
      //   this.keepMessageForDisconnectedClients({ ...message, updates });
      // }
    }
    this.pendingMessages = [];
  }

  // disconnect(clientId: ClientId) {
  //   if (!(clientId in this.disconnectedClients)) {
  //     this.disconnectedClients[clientId] = {
  //       missedMessages: [],
  //       messagesSent: [],
  //     };
  //   }
  // }

  // reconnect(clientId: ClientId) {
  //   const clientListeners = this.listeners.filter(
  //     ({ clientId: listenerId }) => clientId === listenerId
  //   )!;
  //   const missedMessages = this.disconnectedClients[clientId].missedMessages;
  //   for (let message of missedMessages) {
  //     for (let { callback } of clientListeners) {
  //       callback(message);
  //     }
  //   }
  //   const listeners = this.peersOf(clientId);
  //   const messagesSent = this.disconnectedClients[clientId].messagesSent;
  //   for (let message of messagesSent) {
  //     this.notifyListeners(listeners, message);
  //   }
  //   delete this.disconnectedClients[clientId];
  // }

  private notifyListeners(listeners: NetworkListener[], message: Message) {
    // remove this
    // const updates = this.conflictResolver.resolveConflicts(message.stateVector, message.updates);
    // if (updates.length) {
    //   this.conflictResolver.addUpdateToHistory(message.stateVector, updates);
    //   listeners = listeners.filter(({ clientId }) => this.isConnected(clientId));
    // console.log(message.clientId);
    // console.log(updates);
    // this.keepMessageForDisconnectedClients({ ...message, updates });
    // }
    for (let { callback } of listeners) {
      callback(JSON.parse(JSON.stringify(message)));
    }
  }

  // private keepMessageForDisconnectedClients(message: Message) {
  //   for (let clientId in this.disconnectedClients) {
  //     this.disconnectedClients[clientId].missedMessages.push(message);
  //   }
  // }

  // private isConnected(clientId: ClientId) {
  //   return !(clientId in this.disconnectedClients);
  // }

  // private peersOf(clientId: ClientId): NetworkListener[] {
  //   return this.listeners.filter(({ clientId: listenerId }) => clientId !== listenerId);
  // }
}
