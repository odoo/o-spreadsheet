import { uuidv4 } from "../helpers/index";
import { StateVector, Update, Message, Network, SynchronizedState } from "../types/multi_user";

export class NetworkSynchronizedState implements SynchronizedState {
  private clientId = uuidv4();
  private stateVector: StateVector = {
    [this.clientId]: 0,
  };
  private listeners: ((updates: Update[]) => void)[] = [];

  constructor(private network: Network) {
    this.network.onNewMessage(this.clientId, this.onNewMessage.bind(this));
  }

  apply(updates: Update[]) {
    this.stateVector[this.clientId]++;
    this.network.sendMessage({
      clientId: this.clientId,
      stateVector: this.stateVector,
      updates,
    });
  }

  onStateUpdated(callback: (updates: Update[]) => void) {
    this.listeners.push(callback);
  }

  private onNewMessage(message: Message) {
    this.stateVector[this.clientId]++;
    const remoteStateVector: StateVector = message.stateVector;
    const newStateVector = {};
    const clientIds = new Set(Object.keys(remoteStateVector).concat(Object.keys(this.stateVector)));
    for (let clientId of clientIds) {
      const state1 = remoteStateVector[clientId] || 0;
      const state2 = this.stateVector[clientId] || 0;
      newStateVector[clientId] = Math.max(state1, state2);
    }
    this.stateVector = newStateVector;
    this.notifyListeners(message.updates);
  }

  private notifyListeners(updates: Update[]) {
    for (let callback of this.listeners) {
      callback(updates);
    }
  }
}
