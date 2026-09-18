import { PluginConstructor, providePlugins, usePlugin } from "@odoo/owl";

/**
 * Comes from https://github.com/odoo/odoo/blob/master/addons/web/static/src/owl2/utils.js
 */
export function render(component: any, deep = false) {
  component.__owl__.render(deep);
}

export function providePluginsIfNotPresent(
  pluginConstructors: PluginConstructor[],
  config: Object = {}
) {
  for (const pluginConstructor of pluginConstructors) {
    try {
      usePlugin(pluginConstructor);
    } catch (e) {
      providePlugins([pluginConstructor], config);
    }
  }
}
