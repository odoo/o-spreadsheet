import { Plugin, types, useConfig } from "@odoo/owl";

export class PopoverContainerPlugin extends Plugin {
  rect = useConfig("popoverContainerRectSignal", types.signal());
}
