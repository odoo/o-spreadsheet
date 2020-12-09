import { CoreCommand } from "./commands";
import { UID } from "./misc";

export type ClientId = string;

export interface Message {
  clientId: ClientId;
  timestamp: number;
  commands: CoreCommand[];
  transactionId: UID;
}

export interface ReceivedMessage extends Message {
  previousTransactionId: UID;
}

export type NewMessageCallback = (message: ReceivedMessage) => void;

export interface NetworkListener {
  clientId: ClientId;
  callback: NewMessageCallback;
}

export interface Network {
  sendMessage: (message: Message) => void;
  onNewMessage: (clientId: ClientId, callback: NewMessageCallback) => void;
}
