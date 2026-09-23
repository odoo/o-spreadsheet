import * as o_spreadsheet from "../../src";
import { corePluginRegistry } from "../../src/plugins/plugin_registries";

describe("every plugin CorePluginRegistry  is exported", () => {
  const exported = new Set<unknown>(Object.values(o_spreadsheet.corePlugins));

  test.each(corePluginRegistry.getAll().map((Plugin) => [Plugin.name, Plugin] as const))(
    "%s",
    (_pluginName, Plugin) => {
      expect(exported.has(Plugin)).toBe(true);
    }
  );
});
