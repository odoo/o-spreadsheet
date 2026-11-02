import { PluginConstructor, usePlugin } from "@odoo/owl";

/**
 * Comes from https://github.com/odoo/odoo/blob/master/addons/web/static/src/owl2/utils.js
 */
export function render(component: any, deep = false) {
  component.__owl__.render(deep);
}

/**
 * Whether the plugin is already provided in the current scope (or one of its parents).
 */
export function hasPlugin(pluginConstructor: PluginConstructor): boolean {
  try {
    usePlugin(pluginConstructor);
    return true;
  } catch (e) {
    return false;
  }
}
