import { UID } from "@odoo/o-spreadsheet-engine";
import { CoreCommand } from "..";
import { ClientId } from "./session";

export interface RevisionData {
  readonly id: UID;
  readonly clientId: ClientId;
  readonly commands: readonly CoreCommand[];
}
