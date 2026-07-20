import { GridRenderingContext, LayerName, Model, UID } from "../../../src";
import { HoveredIconStore } from "../../../src/components/grid_overlay/hovered_icon_store";
import { StandaloneViewport } from "../../../src/components/standalone_viewport/standalone_viewport";
import { DEFAULT_CELL_HEIGHT } from "../../../src/constants";
import { toXC } from "../../../src/helpers/coordinates";
import { ViewportCollection } from "../../../src/helpers/viewport_collection";
import { positions, toZone, zoneToXc } from "../../../src/helpers/zones";
import { GridRenderer } from "../../../src/stores/grid_renderer_store";
import { PropsOf } from "../../../src/types/props_of";
import {
  addDataValidation,
  clickAndDrag,
  clickCell,
  clickGridIcon,
  extendMockGetBoundingClientRect,
  getCellContent,
  hideColumns,
  hoverGridIcon,
  setCellContent,
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

type MountViewportArgs = Omit<Partial<PropsOf<StandaloneViewport>>, "range"> & { sheetId?: UID };

async function mountViewport(zone: string, args: MountViewportArgs = {}) {
  const sheetId = args.sheetId || model.getters.getSheetIds()[0];
  const range = model.getters.getRangeFromSheetXC(sheetId, zone);
  const returnValue = await mountComponent(StandaloneViewport, {
    model,
    props: { ...args, range },
  });
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

  test("Default column size depends on max col width", async () => {
    setGrid(model, { A1: "Hello", B1: "ThisIsALongText" });
    await mountViewport("A1:B1");

    expect(getLastRenderedBoxes()).toMatchObject([
      { id: "A1", height: DEFAULT_CELL_HEIGHT, width: 264, x: 0, y: 0 },
      { id: "B1", height: DEFAULT_CELL_HEIGHT, width: 736, x: 264, y: 0 },
    ]);

    setCellContent(model, "A1", "ThisIsALongText");
    await nextTick();

    expect(getLastRenderedBoxes()).toMatchObject([
      { id: "A1", height: DEFAULT_CELL_HEIGHT, width: 500, x: 0, y: 0 },
      { id: "B1", height: DEFAULT_CELL_HEIGHT, width: 500, x: 500, y: 0 },
    ]);
  });

  test("Can use custom column weight", async () => {
    setGrid(model, { A1: "Hello", B1: "Hello" });
    await mountViewport("A1:B1", { columnWeights: [1, 3] });

    expect(getLastRenderedBoxes()).toMatchObject([
      { id: "A1", height: DEFAULT_CELL_HEIGHT, width: 250, x: 0, y: 0 },
      { id: "B1", height: DEFAULT_CELL_HEIGHT, width: 750, x: 250, y: 0 },
    ]);
  });

  test("Hidden columns are taken into account", async () => {
    setGrid(model, { A1: "Hello", B1: "Hello", C1: "Hello", D1: "Hello" });
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
    const { env } = await mountViewport("A1:A2");

    expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1");
    await clickCell(env, "A2", {}, { viewports });
    expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A2");
  });

  test("Can hover and click on an icon inside a standalone viewport", async () => {
    setGrid(model, { A1: "FALSE" });
    addDataValidation(model, "A1:A2", "id", { type: "isBoolean", values: [] });

    const { env } = await mountViewport("A1:A2");
    const iconStore = env.getStore(HoveredIconStore);
    expect(iconStore.hoveredIcon).toBeUndefined();

    await hoverGridIcon(env, "A1", viewports);
    expect(iconStore.hoveredIcon).toMatchObject({ position: { col: 0, row: 0 } });

    await clickGridIcon(env, "A1", viewports);
    expect(getCellContent(model, "A1")).toEqual("TRUE");
  });

  describe("Column resize", () => {
    test("Can increase the size of a column", async () => {
      setGrid(model, { A1: "Hello", B1: "Hello", C1: "Hello", D1: "Hello" });
      const onResizeColumns = jest.fn();
      const { fixture } = await mountViewport("A1:D1", { onResizeColumns, canResizeColumns: true });

      const resizers = fixture.querySelectorAll<HTMLElement>(".o-col-resizer");
      expect(resizers).toHaveLength(3);
      expect([...resizers].map((r) => r.style.left)).toEqual(["250px", "500px", "750px"]);

      await clickAndDrag(resizers[1], { x: 100, y: 0 }, { x: 250, y: 0 }, true);
      expect(onResizeColumns).toHaveBeenLastCalledWith([250, 350, 200, 200]);
    });

    test("When increasing the size of a column, columns on the right shrink relative to their weight", async () => {
      setGrid(model, { A1: "Hello", B1: "Hello", C1: "Hello" });
      const onResizeColumns = jest.fn();
      const { fixture } = await mountViewport("A1:C1", {
        onResizeColumns,
        canResizeColumns: true,
        columnWeights: [250, 500, 250],
      });

      const resizers = fixture.querySelectorAll<HTMLElement>(".o-col-resizer");
      expect(resizers).toHaveLength(2);
      expect([...resizers].map((r) => r.style.left)).toEqual(["250px", "750px"]);

      await clickAndDrag(resizers[0], { x: 100, y: 0 }, { x: 250, y: 0 }, true);
      expect(onResizeColumns).toHaveBeenLastCalledWith([350, 430, 220]);
    });

    test("Can decrease the size of a column", async () => {
      setGrid(model, { A1: "Hello", B1: "Hello", C1: "Hello", D1: "Hello" });
      const onResizeColumns = jest.fn();
      const { fixture } = await mountViewport("A1:D1", { onResizeColumns, canResizeColumns: true });

      const resizers = fixture.querySelectorAll<HTMLElement>(".o-col-resizer");
      expect(resizers).toHaveLength(3);
      expect([...resizers].map((r) => r.style.left)).toEqual(["250px", "500px", "750px"]);

      await clickAndDrag(resizers[0], { x: -150, y: 0 }, { x: 250, y: 0 }, true);
      expect(onResizeColumns).toHaveBeenLastCalledWith([100, 300, 300, 300]);
    });

    test("When decreasing the size of a column, columns on the right grow relative to their weight", async () => {
      setGrid(model, { A1: "Hello", B1: "Hello", C1: "Hello" });
      const onResizeColumns = jest.fn();
      const { fixture } = await mountViewport("A1:C1", {
        onResizeColumns,
        canResizeColumns: true,
        columnWeights: [250, 500, 250],
      });

      const resizers = fixture.querySelectorAll<HTMLElement>(".o-col-resizer");
      expect(resizers).toHaveLength(2);
      expect([...resizers].map((r) => r.style.left)).toEqual(["250px", "750px"]);

      await clickAndDrag(resizers[0], { x: -100, y: 0 }, { x: 250, y: 0 }, true);
      expect(onResizeColumns).toHaveBeenLastCalledWith([150, 569, 281]);
    });

    test("Cannot make the resized column too small", async () => {
      setGrid(model, { A1: "Hello", B1: "Hello", C1: "Hello", D1: "Hello" });
      const onResizeColumns = jest.fn();
      const { fixture } = await mountViewport("A1:D1", { onResizeColumns, canResizeColumns: true });

      const resizers = fixture.querySelectorAll<HTMLElement>(".o-col-resizer");
      await clickAndDrag(resizers[0], { x: -500, y: 0 }, { x: 250, y: 0 }, true);
      expect(onResizeColumns).toHaveBeenLastCalledWith([50, 316, 316, 318]);
    });

    test("Increasing the size of a column cannot make the other columns too small", async () => {
      setGrid(model, { A1: "Hello", B1: "Hello", C1: "Hello", D1: "Hello" });
      const onResizeColumns = jest.fn();
      const { fixture } = await mountViewport("A1:D1", { onResizeColumns, canResizeColumns: true });

      const resizers = fixture.querySelectorAll<HTMLElement>(".o-col-resizer");
      await clickAndDrag(resizers[0], { x: 750, y: 0 }, { x: 250, y: 0 }, true);
      expect(onResizeColumns).toHaveBeenLastCalledWith([850, 50, 50, 50]);
    });
  });
});
