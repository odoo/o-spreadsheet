import { UIPlugin } from "../ui_plugin";

/**
 * This plugin provides dynamic translation getter. In o-spreadsheet, it has
 * no implementation, but this plugin can be replaced by another one to provide
 * a real implementation.
 *
 * For example, in Odoo, the plugin is replaced by a plugin that used the
 * module namespace to dynamically translate terms.
 */
export class DynamicTranslate extends UIPlugin {
  static getters = ["dynamicTranslate"] as const;

  dynamicTranslate(term: string) {
    return term;
  }
}
