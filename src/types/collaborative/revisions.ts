import { CoreCommand, UID } from "..";
import { ClientId } from "./session";

export interface RevisionData {
  readonly id: UID;
  readonly clientId: ClientId;
  readonly commands: readonly CoreCommand[];
}
