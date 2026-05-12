import { Model, UID } from "../../../src";
import { HoveredIconStore } from "../../../src/components/grid_overlay/hovered_icon_store";
import { StandaloneViewport } from "../../../src/components/standalone_viewport/standalone_viewport";
import { DEFAULT_CELL_HEIGHT } from "../../../src/constants";
import { toXC } from "../../../src/helpers/coordinates";
import { buildSheetLink } from "../../../src/helpers/misc";
import { positions, toZone, zoneToXc } from "../../../src/helpers/zones";
import { useChildSubEnv } from "../../../src/owl3_compatibility_layer";
import { GridRenderer } from "../../../src/stores/grid_renderer_store";
import { ViewportsStore } from "../../../src/stores/viewports_store";
import { PropsOf } from "../../../src/types/props_of";
import { SpreadsheetChildEnv } from "../../../src/types/spreadsheet_env";
import {
  addDataValidation,
  clickAndDrag,
  clickCell,
  clickGridIcon,
  createSheet,
  extendMockGetBoundingClientRect,
  getCellContent,
  hideColumns,
  hoverCell,
  hoverGridIcon,
  setCellContent,
  simulateClick,
  triggerWheelEvent,
} from "../../test_helpers";
import { mountComponentWithPortalTarget, nextTick, setGrid } from "../../test_helpers/helpers";
import { spyStoreCreation, StoreSpy } from "../../test_helpers/stores";

let model: Model;
let storeSpy: StoreSpy;

// We need to use the subEnv of the standalone viewport to get the store children of the standalone viewport instead of the global ones
let subEnv: SpreadsheetChildEnv;

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
  createSheet(model, { sheetId: "sh2", name: "Sheet2" });
  storeSpy = spyStoreCreation();
  viewportHeight = 1000;

  const originalSetup = StandaloneViewport.prototype["setup"];
  jest
    .spyOn(StandaloneViewport.prototype, "setup")
    .mockImplementation(function (this: StandaloneViewport) {
      originalSetup.call(this);
      // In real life this is defined by the standalone viewport's parent (grid)
      useChildSubEnv({
        getPopoverContainerRect: () => ({ x: 0, y: 0, width: 1000, height: 1000 }),
      });
      subEnv = this.env;
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

type MountViewportArgs = Omit<Partial<PropsOf<StandaloneViewport>>, "range"> & { sheetId?: UID };

async function mountViewport(zone: string, args: MountViewportArgs = {}) {
  const sheetId = args.sheetId || model.getters.getSheetIds()[0];
  const range = model.getters.getRangeFromSheetXC(sheetId, zone);
  const returnValue = await mountComponentWithPortalTarget(StandaloneViewport, {
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

  test("Can use a standalone viewport to display a range of another sheet", async () => {
    setGrid(model, { A1: "Hello", A2: "World" }, "sh2");
    await mountViewport("A1:A2", { sheetId: "sh2" });

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
    setGrid(model, { A1: "Hello", A2: "World", A3: "!" });
    await mountViewport("A1:A3");
    const viewStore = subEnv.getStore(ViewportsStore);

    expect(".o-scrollbar").toHaveCount(1);
    expect(viewStore.activeSheetScrollInfo.scrollY).toBe(0);

    // Wheel event on viewport
    triggerWheelEvent(".o-standalone-viewport", { deltaY: 10 });
    await nextTick();
    expect(viewStore.activeSheetScrollInfo.scrollY).toBe(10);

    // Scroll event on scrollbar
    const scrollBar = document.querySelector<HTMLElement>(".o-scrollbar")!;
    scrollBar.scrollTop = 20;
    scrollBar.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(viewStore.activeSheetScrollInfo.scrollY).toBe(20);
  });

  test("Clicking on a dashboard cell select the cell", async () => {
    setGrid(model, { A1: "Hello", A2: "World" }, "sh2");
    await mountViewport("A1:A2", { sheetId: "sh2" });

    expect(model.getters.getActiveSheetId()).not.toEqual("sh2");
    expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1");
    await clickCell(subEnv, "A2", {});
    expect(model.getters.getActiveSheetId()).toEqual("sh2");
    expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A2");
  });

  test("Can hover and click on an icon inside a standalone viewport", async () => {
    setGrid(model, { A1: "FALSE" }, "sh2");
    addDataValidation(model, "A1:A2", "id", { type: "isBoolean", values: [] }, "blocking", "sh2");

    await mountViewport("A1:A2", { sheetId: "sh2" });
    const iconStore = subEnv.getStore(HoveredIconStore);
    expect(iconStore.hoveredIcon).toBeUndefined();

    await hoverGridIcon(subEnv, "A1");
    expect(iconStore.hoveredIcon).toMatchObject({ position: { sheetId: "sh2", col: 0, row: 0 } });

    await clickGridIcon(subEnv, "A1");
    expect(getCellContent(model, "A1")).toEqual("TRUE");
  });

  test("Can use clickable cells inside standalone viewport", async () => {
    createSheet(model, { sheetId: "sh3" });
    setCellContent(model, "A1", `[label](${buildSheetLink("sh3")})`, "sh2");
    model.updateMode("dashboard");

    await mountViewport("A1", { sheetId: "sh2" });
    expect(".o-dashboard-clickable-cell").toHaveCount(1);

    await simulateClick(".o-dashboard-clickable-cell");
    expect(model.getters.getActiveSheetId()).toEqual("sh3");
  });

  test("Can use cell popover in standalone viewport", async () => {
    jest.useFakeTimers();
    setCellContent(model, "A1", "=0/0", "sh2");

    await mountViewport("A1", { sheetId: "sh2" });
    expect(".o-popover").toHaveCount(0);

    await hoverCell(subEnv, "A1", 500);
    expect(".o-popover").toHaveCount(1);
    expect(".o-popover").toHaveText("ErrorThe divisor must be different from zero.");
    jest.useRealTimers();
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
