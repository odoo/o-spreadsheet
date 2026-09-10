import { DOMCoordinates, Model, Rect } from "../../src";
import { AutofillStore } from "../../src/components/autofill/autofill_store";
import {
  AUTOFILL_EDGE_LENGTH,
  CANVAS_SHIFT,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
} from "../../src/constants";
import { toZone } from "../../src/helpers/zones";
import { EASING_FN } from "../../src/registries/cell_animation_registry";
import { DependencyContainer } from "../../src/store_engine/dependency_container";
import { RendererStore } from "../../src/stores/renderer_store";
import {
  SELECTION_ANIMATION_DURATION,
  SelectionRendererStore,
  SelectionRenderingState,
} from "../../src/stores/selection_renderer_store";
import { ViewportsStore } from "../../src/stores/viewports_store";
import { registerCleanup } from "../setup/jest.setup";
import {
  activateSheet,
  addCellToSelection,
  createSheet,
  selectCell,
  selectColumn,
  selectRow,
  setSelection,
} from "../test_helpers/commands_helpers";
import { MockGridRenderingContext } from "../test_helpers/renderer_helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

let easingSpy: jest.SpyInstance;
let lastDrawnSelectionState!: SelectionRenderingState;
let lastDrawnAutofillRectCenter!: DOMCoordinates;
let model: Model;
let container: DependencyContainer;
let drawGrid: () => void;
let selectionRendererStore: SelectionRendererStore;
let rendererStore: RendererStore;
let animationFrameCallback: (timeStamp: number) => void;

function isCurrentlyAnimating(): boolean {
  return selectionRendererStore.animatedSelection !== undefined;
}

beforeAll(() => {
  // Make the animation linear for easier testing
  easingSpy = jest.spyOn(EASING_FN, "easeOutQuart").mockImplementation((t: number) => t);
});

afterAll(() => {
  easingSpy.mockRestore();
});

function toCellRect(xc: string): Rect {
  const zone = toZone(xc);
  return {
    x: zone.left * DEFAULT_CELL_WIDTH,
    y: zone.top * DEFAULT_CELL_HEIGHT,
    width: (zone.right - zone.left + 1) * DEFAULT_CELL_WIDTH,
    height: (zone.bottom - zone.top + 1) * DEFAULT_CELL_HEIGHT,
  };
}

beforeEach(() => {
  model = new Model();
  ({ container, store: selectionRendererStore } = makeStoreWithModel(
    model,
    SelectionRendererStore
  ));
  rendererStore = container.get(RendererStore);
  container.get(AutofillStore);

  const ctx = new MockGridRenderingContext(model, container, 1000, 1000, {
    onFunctionCall: (fn, args, renderingContext) => {
      if (fn === "clearRect") {
        const rect = { x: args[0], y: args[1], width: args[2], height: args[3] };
        if (rect.width === AUTOFILL_EDGE_LENGTH) {
          const x = rect.x + rect.width / 2 + CANVAS_SHIFT; // Add back the canvas shift that was applied during rendering for easier testing
          const y = rect.y + rect.height / 2 + CANVAS_SHIFT;
          lastDrawnAutofillRectCenter = { x, y };
        }
      }
    },
  });

  jest
    .spyOn(selectionRendererStore, "drawSelection")
    .mockImplementation((ctx, state) => (lastDrawnSelectionState = state));

  const spyRequestAnimationFrame = jest
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((callback) => {
      animationFrameCallback = callback;
      return 1;
    });
  const spyCancelAnimationFrame = jest.spyOn(window, "cancelAnimationFrame");
  registerCleanup(() => {
    spyRequestAnimationFrame.mockRestore();
    spyCancelAnimationFrame.mockRestore();
  });

  drawGrid = () => {
    rendererStore.draw(ctx);
  };
});

describe("Selection animation", () => {
  test("Moving the selection animates the selected zone and the active cell", () => {
    selectCell(model, "A1");
    drawGrid();
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("A1"));
    expect(lastDrawnSelectionState.selectedZonesRects).toEqual([toCellRect("A1")]);

    selectCell(model, "C3");
    drawGrid();
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("A1"));
    expect(lastDrawnSelectionState.selectedZonesRects).toEqual([toCellRect("A1")]);

    animationFrameCallback(0);
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("A1"));
    expect(lastDrawnSelectionState.selectedZonesRects).toEqual([toCellRect("A1")]);

    animationFrameCallback(SELECTION_ANIMATION_DURATION / 2);
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("B2")); // Halfway to C3
    expect(lastDrawnSelectionState.selectedZonesRects).toEqual([toCellRect("B2")]);

    animationFrameCallback(SELECTION_ANIMATION_DURATION);
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("C3"));
    expect(lastDrawnSelectionState.selectedZonesRects).toEqual([toCellRect("C3")]);
  });

  test("The size of the selected zone is animated", () => {
    selectCell(model, "A1");
    drawGrid();

    setSelection(model, ["A1:C3"]);
    drawGrid();
    animationFrameCallback(0);
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("A1"));
    expect(lastDrawnSelectionState.selectedZonesRects).toEqual([toCellRect("A1")]);

    animationFrameCallback(SELECTION_ANIMATION_DURATION / 2);
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("A1"));
    expect(lastDrawnSelectionState.selectedZonesRects).toEqual([toCellRect("A1:B2")]); // Halfway to C3

    animationFrameCallback(SELECTION_ANIMATION_DURATION);
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("A1"));
    expect(lastDrawnSelectionState.selectedZonesRects).toEqual([toCellRect("A1:C3")]);
  });

  test("Animation frames are stopped at the end of the animation", () => {
    const spyStopAnimation = jest.spyOn(window, "cancelAnimationFrame");

    selectCell(model, "A1");
    drawGrid();

    selectCell(model, "C3");
    drawGrid();
    expect(spyStopAnimation).toHaveBeenCalledTimes(0);

    animationFrameCallback(0);
    animationFrameCallback(SELECTION_ANIMATION_DURATION);
    expect(spyStopAnimation).toHaveBeenCalledTimes(1);
  });

  test("No animation when the selection does not change", () => {
    selectCell(model, "C3");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);
    selectCell(model, "C3");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);
  });

  test("No animation when changing sheet", () => {
    createSheet(model, { sheetId: "sh2" });
    selectCell(model, "C3");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);

    activateSheet(model, "sh2");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);
  });

  test("No animation when there are multiple selected zones", () => {
    selectCell(model, "A1");
    drawGrid();

    addCellToSelection(model, "C3");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);

    selectCell(model, "E5");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);
  });

  test("No animation when a whole column or row is selected", () => {
    selectCell(model, "A1");
    drawGrid();

    selectColumn(model, 2, "overrideSelection");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);

    selectRow(model, 2, "overrideSelection");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);

    selectCell(model, "A1");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);
  });

  test("The animation is replaced when the selection changes during the animation", () => {
    selectCell(model, "A1");
    drawGrid();

    selectCell(model, "C3");
    drawGrid();
    animationFrameCallback(0);
    animationFrameCallback(SELECTION_ANIMATION_DURATION / 2);
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("B2"));

    selectCell(model, "E5");
    drawGrid();
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("C3"));

    animationFrameCallback(0);
    animationFrameCallback(SELECTION_ANIMATION_DURATION / 2);
    expect(lastDrawnSelectionState.activeZoneRect).toEqual(toCellRect("D4"));
  });

  test("No animation when scrolling", () => {
    const viewStore = container.get(ViewportsStore);
    selectCell(model, "C3");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);

    viewStore.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH, offsetY: 0 });
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);
  });

  test("The animation can be disabled for the next render only", () => {
    selectCell(model, "A1");
    drawGrid();

    selectionRendererStore.disableAnimationForNextRender();
    selectCell(model, "C3");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(false);

    selectCell(model, "E5");
    drawGrid();
    expect(isCurrentlyAnimating()).toBe(true);
  });

  test("The autofill square follows the animated selection", () => {
    selectCell(model, "A1");
    drawGrid();
    expect(lastDrawnAutofillRectCenter).toMatchObject({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT,
    });

    selectCell(model, "C3");
    drawGrid();
    animationFrameCallback(0);
    expect(lastDrawnAutofillRectCenter).toMatchObject({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT,
    });

    animationFrameCallback(SELECTION_ANIMATION_DURATION / 2);
    expect(lastDrawnAutofillRectCenter).toMatchObject({
      x: DEFAULT_CELL_WIDTH * 2,
      y: DEFAULT_CELL_HEIGHT * 2,
    });

    animationFrameCallback(SELECTION_ANIMATION_DURATION);
    expect(lastDrawnAutofillRectCenter).toMatchObject({
      x: DEFAULT_CELL_WIDTH * 3,
      y: DEFAULT_CELL_HEIGHT * 3,
    });
  });
});
