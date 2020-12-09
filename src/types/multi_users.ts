import { CoreCommand } from "./commands";
import { UID } from "./misc";

export type ClientId = string;

export interface Message {
  clientId: ClientId;
  timestamp: number;
  commands: CoreCommand[];
  transactionId: UID;
}

export type NewMessageCallback = (message: Required<Message>) => void;

export interface NetworkListener {
  clientId: ClientId;
  callback: NewMessageCallback;
}

export interface Network {
  sendMessage: (message: Message) => void;
  onNewMessage: (clientId: ClientId, callback: NewMessageCallback) => void;
  getTicket: () => Promise<number>;
}
