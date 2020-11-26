import { CoreCommand } from "./commands";
import { UID } from "./misc";

export type ClientId = string;

export type StateVector = Record<ClientId, number>;

export interface BaseMessage {
  clientId: ClientId;
}

export interface CommandMessage extends BaseMessage {
  type: "COMMAND";
  stateVector: StateVector;
  commands: CoreCommand[];
  transactionId: UID;
}

export interface ConnectionMessage extends BaseMessage {
  type: "CONNECTION";
  messages: CommandMessage[];
}

export interface UndoMessage extends BaseMessage {
  type: "SELECTIVE_UNDO";
  transactionId: UID;
}

export type Message = CommandMessage | UndoMessage | ConnectionMessage;

export type NewMessageCallback = (message: Message) => void;

export interface NetworkListener {
  clientId: ClientId;
  callback: NewMessageCallback;
}

export interface Network {
  sendMessage: (message: Message) => void;
  onNewMessage: (clientId: ClientId, callback: NewMessageCallback) => void;
}
