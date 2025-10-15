import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { PopoverBuilders } from "../types/cell_popovers";

export const cellPopoverRegistry = new Registry<PopoverBuilders>();
