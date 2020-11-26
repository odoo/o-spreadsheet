import { CoreCommand } from "./commands";

export type ClientId = string;

export interface Message {
  clientId: ClientId;
  timestamp: number;
  commands: CoreCommand[];
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
