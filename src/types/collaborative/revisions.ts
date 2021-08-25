import { CoreCommand } from "../commands";
import { UID } from "../misc";
import { ClientId } from "./session";

export interface RevisionData {
  readonly id: UID;
  readonly clientId: ClientId;
  readonly commands: readonly CoreCommand[];
}
