import { Model, UID } from "../../src";
import { TABLE_HOVER_BACKGROUND_COLOR } from "../../src/constants";
import { DependencyContainer } from "../../src/store_engine/dependency_container";
import {
  CellHoverOverlayProvider,
  CellHoverOverlayStore,
} from "../../src/stores/cell_hover_overlay_store";
import { Store } from "../../src/types/store_engine";
import { makeStore } from "../test_helpers/stores";

describe("Cell hover overlay store", () => {
  let hoveredCellOverlayStore: Store<CellHoverOverlayStore>;
  let model: Model;
  let sheetId: UID;
  let container: DependencyContainer;

  beforeEach(() => {
    ({ model, container } = makeStore(CellHoverOverlayStore));
    hoveredCellOverlayStore = container.get(CellHoverOverlayStore);
    sheetId = model.getters.getActiveSheetId();
  });

  test("Store doesn't trigger a re-render when nothing changes", () => {
    const A1 = { sheetId, col: 0, row: 0 };
    let result = hoveredCellOverlayStore.hover(A1);
    expect(result).toBe("noStateChange"); // No render: no overlay provider are registered in the store yet
    expect(hoveredCellOverlayStore.overlayColors.get(A1)).toBe(undefined);

    hoveredCellOverlayStore.register({
      getHighlightedPositions: (hoveredPosition) => [hoveredPosition],
    });

    result = hoveredCellOverlayStore.hover(A1);
    expect(result).toBe(undefined); // Trigger render
    expect(hoveredCellOverlayStore.overlayColors.get(A1)).toBe(TABLE_HOVER_BACKGROUND_COLOR);

    result = hoveredCellOverlayStore.hover(A1);
    expect(result).toBe("noStateChange"); // No render: hover the same cell
    expect(hoveredCellOverlayStore.overlayColors.get(A1)).toBe(TABLE_HOVER_BACKGROUND_COLOR);
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

    hoveredCellOverlayStore.register(A1Provider);
    hoveredCellOverlayStore.hover(A1);
    expect(hoveredCellOverlayStore.overlayColors.get(A1)).toBe(TABLE_HOVER_BACKGROUND_COLOR);

    hoveredCellOverlayStore.register(A2Provider);
    expect(hoveredCellOverlayStore.overlayColors.get(A1)).toBe(undefined);

    hoveredCellOverlayStore.hover(A2);
    expect(hoveredCellOverlayStore.overlayColors.get(A2)).toBe(TABLE_HOVER_BACKGROUND_COLOR);

    hoveredCellOverlayStore.unRegister(A2Provider);
    expect(hoveredCellOverlayStore.overlayColors.get(A2)).toBe(undefined);
  });
});
