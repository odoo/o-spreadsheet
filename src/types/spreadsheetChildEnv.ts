import { Locale } from "@odoo/o-spreadsheet-engine";
import { ClipboardInterface } from "@odoo/o-spreadsheet-engine/types/clipboard/clipboard_interface";
import { Currency } from "@odoo/o-spreadsheet-engine/types/currency";
import { ImageProviderInterface } from "@odoo/o-spreadsheet-engine/types/files";
import { Get } from "@odoo/o-spreadsheet-engine/types/store_engine";
import { NotificationStoreMethods } from "@odoo/o-spreadsheet-engine/types/stores/notification_store_methods";
import { Model } from "../model";

export interface SpreadsheetChildEnv extends NotificationStoreMethods {
  model: Model;
  imageProvider?: ImageProviderInterface;
  isDashboard: () => boolean;
  openSidePanel: (panel: string, panelProps?: any) => void;
  replaceSidePanel: (panel: string, currentPanel: string, panelProps?: any) => void;
  toggleSidePanel: (panel: string, panelProps?: any) => void;
  clipboard: ClipboardInterface;
  startCellEdition: (content?: string) => void;
  loadCurrencies?: () => Promise<Currency[]>;
  loadLocales: () => Promise<Locale[]>;
  getStore: Get;
  isSmall: boolean;
  isMobile: () => boolean;
}
