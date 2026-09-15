import { Plugin, signal } from "@odoo/owl";
import { isMobileOS } from "../components/helpers/dom_helpers";

export class MobilePlugin extends Plugin {
  isMobile = signal(isMobileOS());
}
