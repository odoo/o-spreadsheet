import { Plugin, useConfig } from "@odoo/owl";
import { Rect } from "../../types/rendering";

export class PopoverContainerPlugin extends Plugin {
  getContainerRect: () => Rect = useConfig("getPopoverContainerRect");
}
