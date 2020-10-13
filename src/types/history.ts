import { Command } from "./commands";
import { UID } from "./misc";

export interface HistoryUpdate {
  id: UID;
  clientId: UID;
  changes: HistoryChange[];
  commands: Command[]; // Manage multi-commands
}

export interface HistoryChange {
  root: any;
  path: (string | number)[];
  before: any;
  after: any;
}
