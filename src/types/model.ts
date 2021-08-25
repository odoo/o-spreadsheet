import { Client, ClientPosition } from "./collaborative/session";
import { TransportService } from "./collaborative/transport_service";
import { EvalContext } from "./functions";
import { Mode } from "./misc";

export interface ModelConfig {
  mode: Mode;
  openSidePanel: (panel: string, panelProps?: any) => void;
  notifyUser: (content: string) => any;
  askConfirmation: (content: string, confirm: () => any, cancel?: () => any) => any;
  editText: (title: string, placeholder: string, callback: (text: string | null) => any) => any;
  evalContext: EvalContext;
  moveClient: (position: ClientPosition) => void;
  transportService: TransportService;
  client: Client;
  isHeadless: boolean;
  isReadonly: boolean;
  snapshotRequested: boolean;
}
