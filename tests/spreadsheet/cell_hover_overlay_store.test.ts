import { effect, PluginInstance } from "@odoo/owl";
import { Model, UID } from "../../src";
import { TABLE_HOVER_BACKGROUND_COLOR } from "../../src/constants";
import {
  CellHoverOverlayPlugin,
  CellHoverOverlayProvider,
} from "../../src/owl_plugins/cell_hover_overlay_owl_plugin";
import { HoveredCellPlugin } from "../../src/owl_plugins/hovered_cell_owl_plugin";
import { OwlPluginGetter } from "../../src/types/spreadsheet_env";
import { nextTick } from "../test_helpers/helpers";
import { makeOwlPluginManager } from "../test_helpers/owl_plugins_helpers";

describe("Cell hover overlay store", () => {
  let hoveredCellOverlayPlugin: PluginInstance<typeof CellHoverOverlayPlugin>;
  let hoveredCellPlugin: PluginInstance<typeof HoveredCellPlugin>;
  let model: Model;
  let sheetId: UID;
  let getPlugin: OwlPluginGetter;

  beforeEach(() => {
    ({ model, getPlugin } = makeOwlPluginManager([HoveredCellPlugin, CellHoverOverlayPlugin]));
    hoveredCellOverlayPlugin = getPlugin(CellHoverOverlayPlugin);
    hoveredCellPlugin = getPlugin(HoveredCellPlugin);
    sheetId = model.getters.getActiveSheetId();
  });

  test("Store doesn't trigger a re-render when nothing changes", async () => {
    const effectCalled = jest.fn();
    effect(() => {
      hoveredCellOverlayPlugin.overlayColors(); // Subscribes to overlay colors changes
      effectCalled();
    });

    const A1 = { sheetId, col: 0, row: 0 };
    expect(effectCalled).toHaveBeenCalledTimes(1); // Initial effect call
    hoveredCellPlugin.hover(A1);
    await nextTick();
    expect(effectCalled).toHaveBeenCalledTimes(1); // No render: no overlay provider are registered in the store yet
    expect(hoveredCellOverlayPlugin.overlayColors().get(A1)).toBe(undefined);

    hoveredCellOverlayPlugin.register({
      getHighlightedPositions: (hoveredPosition) => [hoveredPosition],
    });
    await nextTick();
    expect(effectCalled).toHaveBeenCalledTimes(2); // Effect should be called once after registering the provider
    expect(hoveredCellOverlayPlugin.overlayColors().get(A1)).toBe(TABLE_HOVER_BACKGROUND_COLOR);

    hoveredCellPlugin.hover(A1);
    await nextTick();
    expect(effectCalled).toHaveBeenCalledTimes(2); // No render: hover the same cell
    expect(hoveredCellOverlayPlugin.overlayColors().get(A1)).toBe(TABLE_HOVER_BACKGROUND_COLOR);
  });

  test("Store content is reset when registering/unregistering overlay providers", () => {
    const A1 = { sheetId, col: 0, row: 0 };
    const A2 = { sheetId, col: 0, row: 1 };

    const A1Provider: CellHoverOverlayProvider = {
      getHighlightedPositions: (hoveredPosition) =>
        hoveredPosition.row === 0 ? [hoveredPosition] : [],
    };
    const A2Provider: CellHoverOverlayProvider = {
      getHighlightedPositions: (hoveredPosition) =>
        hoveredPosition.row === 1 ? [hoveredPosition] : [],
    };

    hoveredCellOverlayPlugin.register(A1Provider);
    hoveredCellPlugin.hover(A1);
    expect(hoveredCellOverlayPlugin.overlayColors().get(A1)).toBe(TABLE_HOVER_BACKGROUND_COLOR);

    hoveredCellOverlayPlugin.register(A2Provider);
    expect(hoveredCellOverlayPlugin.overlayColors().get(A1)).toBe(TABLE_HOVER_BACKGROUND_COLOR);
    expect(hoveredCellOverlayPlugin.overlayColors().get(A2)).toBe(undefined);

    hoveredCellPlugin.hover(A2);
    expect(hoveredCellOverlayPlugin.overlayColors().get(A1)).toBe(undefined);
    expect(hoveredCellOverlayPlugin.overlayColors().get(A2)).toBe(TABLE_HOVER_BACKGROUND_COLOR);

    hoveredCellOverlayPlugin.unRegister(A2Provider);
    expect(hoveredCellOverlayPlugin.overlayColors().get(A2)).toBe(undefined);
  });
});
