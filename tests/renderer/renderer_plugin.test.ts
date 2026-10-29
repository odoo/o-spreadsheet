import { signal, useProps, xml } from "@odoo/owl";
import { Model } from "../../src";
import { types } from "../../src/components/props_validation";
import { useSpreadsheetProviders } from "../../src/components/spreadsheet/spreadsheet_providers";
import { Component } from "../../src/owl3_compatibility_layer";
import { RendererPlugin } from "../../src/owl_plugins/renderer_plugin";
import { mountComponent, nextTick } from "../test_helpers/helpers";

class SpreadsheetProvidersHost extends Component {
  static template = xml/* xml */ `<div/>`;
  protected props = useProps({ model: types.Model() });

  setup() {
    useSpreadsheetProviders({
      model: this.props.model,
      spreadsheetRef: signal.ref(),
    });
  }
}

class ToggleProvidersHost extends Component {
  static template = xml/* xml */ `
    <SpreadsheetProvidersHost t-if="this.showHost()" model="this.props.model"/>
  `;
  static components = { SpreadsheetProvidersHost };
  protected props = useProps({ model: types.Model() });
  showHost = signal(false);
}

/**
 * An integrator can provide the RendererPlugin above the spreadsheet, so it outlives the
 * spreadsheet's plugins and stores: they must unregister from it when destroyed.
 */
test("Destroyed spreadsheet providers unregister all their renderers from a surviving RendererPlugin", async () => {
  const model = new Model();
  const { parent, getPlugin } = await mountComponent(ToggleProvidersHost, {
    model,
    props: { model },
  });
  const renderer = getPlugin(RendererPlugin);
  const registeredRenderers = () => Object.values(renderer.renderers()).flat();
  const initialRenderers = registeredRenderers();

  (parent as ToggleProvidersHost).showHost.set(true);
  await nextTick();
  expect(registeredRenderers().length).toBeGreaterThan(initialRenderers.length);

  (parent as ToggleProvidersHost).showHost.set(false);
  await nextTick();
  expect(registeredRenderers()).toHaveLength(initialRenderers.length);
  expect(registeredRenderers().every((r) => initialRenderers.includes(r))).toBe(true);
});
