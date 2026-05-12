import { GridRenderingContext, LayerName, Model } from "../../../src";
import { HoveredIconStore } from "../../../src/components/grid_overlay/hovered_icon_store";
import { StandaloneViewport } from "../../../src/components/standalone_viewport/standalone_viewport";
import { DEFAULT_CELL_HEIGHT } from "../../../src/constants";
import { toXC } from "../../../src/helpers/coordinates";
import { ViewportCollection } from "../../../src/helpers/viewport_collection";
import { positions, toZone, zoneToXc } from "../../../src/helpers/zones";
import { GridRenderer } from "../../../src/stores/grid_renderer_store";
import {
  addDataValidation,
  clickCell,
  clickGridIcon,
  extendMockGetBoundingClientRect,
  getCellContent,
  hideColumns,
  hoverGridIcon,
  triggerWheelEvent,
} from "../../test_helpers";
import { mountComponent, nextTick, setGrid } from "../../test_helpers/helpers";
import { spyStoreCreation, StoreSpy } from "../../test_helpers/stores";

let model: Model;
let storeSpy: StoreSpy;
let viewports: ViewportCollection;

let viewportHeight: number = 1000;

extendMockGetBoundingClientRect({
  "o-standalone-viewport-content": () => ({ width: 1000, height: viewportHeight }),
});

function getLastRenderedBoxes(zone?: string) {
  const store = storeSpy.getStores(GridRenderer)[0] as GridRenderer;
  if (zone) {
    const xcs = new Set(positions(toZone(zone)).map((p) => toXC(p.col, p.row)));
    return [...store["lastRenderBoxes"].values()].filter((box) => xcs.has(box.id)); //A DRM TODO: check if useful
  }
  return [...store["lastRenderBoxes"].values()];
}

beforeEach(() => {
  model = new Model();
  storeSpy = spyStoreCreation();
  viewportHeight = 1000;

  const realDrawGrid = GridRenderer.prototype["drawLayer"];
  jest
    .spyOn(GridRenderer.prototype, "drawLayer")
    .mockImplementation(function (
      this: GridRenderer,
      renderingContext: GridRenderingContext,
      layer: LayerName
    ) {
      realDrawGrid.call(this, renderingContext, layer, undefined);
      viewports = renderingContext.viewports;
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function mountViewport(zone: string, sheetId = model.getters.getActiveSheetId()) {
  const range = model.getters.getRangeFromSheetXC(sheetId, zone);
  const returnValue = await mountComponent(StandaloneViewport, { model, props: { range } });
  await nextTick(); // Need another render for the size to be correct
  return returnValue;
}

describe("Standalone viewport", () => {
  test("Can use a standalone viewport to display a range", async () => {
    setGrid(model, { A1: "Hello", A2: "World" });
    await mountViewport("A1:A2");

    expect(getLastRenderedBoxes().map((box) => box.content?.textLines.join())).toEqual([
      "Hello",
      "World",
    ]);
  });

  test("Cells are rendered to fill the viewport vertically", async () => {
    setGrid(model, { A1: "Hello", B1: "World" });
    await mountViewport("A1:B1");

    expect(getLastRenderedBoxes()).toMatchObject([
      { id: "A1", height: DEFAULT_CELL_HEIGHT, width: 500, x: 0, y: 0 },
      { id: "B1", height: DEFAULT_CELL_HEIGHT, width: 500, x: 500, y: 0 },
    ]);
  });

  test("Hidden columns are taken into account", async () => {
    setGrid(model, { A1: "Hello", B1: "Hidden", C1: "Hidden", D1: "World" });
    await mountViewport("A1:D1");

    expect(getLastRenderedBoxes()).toMatchObject([
      { id: "A1", height: DEFAULT_CELL_HEIGHT, width: 250, x: 0, y: 0 },
      { id: "B1", height: DEFAULT_CELL_HEIGHT, width: 250, x: 250, y: 0 },
      { id: "C1", height: DEFAULT_CELL_HEIGHT, width: 250, x: 500, y: 0 },
      { id: "D1", height: DEFAULT_CELL_HEIGHT, width: 250, x: 750, y: 0 },
    ]);

    hideColumns(model, ["B", "C"]);
    await nextTick();

    expect(getLastRenderedBoxes()).toMatchObject([
      { id: "A1", height: DEFAULT_CELL_HEIGHT, width: 500, x: 0, y: 0 },
      { id: "D1", height: DEFAULT_CELL_HEIGHT, width: 500, x: 500, y: 0 },
    ]);
  });

  test("Standalone viewport has no scrollbar if not needed", async () => {
    setGrid(model, { A1: "Hello", A2: "World" });
    await mountViewport("A1:A2");

    expect(".o-scrollbar").toHaveCount(0);
  });

  test("Standalone viewport have a functional scrollbar if too small", async () => {
    viewportHeight = 30;
    const sheetId = model.getters.getActiveSheetId();
    setGrid(model, { A1: "Hello", A2: "World", A3: "!" });
    await mountViewport("A1:A3");

    expect(".o-scrollbar").toHaveCount(1);
    expect(viewports.getSheetScrollInfo(sheetId).scrollY).toBe(0);

    // Wheel event on viewport
    triggerWheelEvent(".o-standalone-viewport", { deltaY: 10 });
    await nextTick();
    expect(viewports.getSheetScrollInfo(sheetId).scrollY).toBe(10);

    // Scroll event on scrollbar
    const scrollBar = document.querySelector<HTMLElement>(".o-scrollbar")!;
    scrollBar.scrollTop = 20;
    scrollBar.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(viewports.getSheetScrollInfo(sheetId).scrollY).toBe(20);
  });

  test("Clicking on a dashboard cell select the cell", async () => {
    setGrid(model, { A1: "Hello", A2: "World" });
    await mountViewport("A1:A2");

    expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1");
    await clickCell(model, "A2", {}, { viewports });
    expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A2");
  });

  test("Can hover and click on an icon inside a standalone viewport", async () => {
    setGrid(model, { A1: "FALSE" });
    addDataValidation(model, "A1:A2", "id", { type: "isBoolean", values: [] });

    const { env } = await mountViewport("A1:A2");
    const iconStore = env.getStore(HoveredIconStore);
    expect(iconStore.hoveredIcon).toBeUndefined();

    await hoverGridIcon(model, "A1", viewports);
    expect(iconStore.hoveredIcon).toMatchObject({ position: { col: 0, row: 0 } });

    await clickGridIcon(model, "A1", viewports);
    expect(getCellContent(model, "A1")).toEqual("TRUE");
  });
});
