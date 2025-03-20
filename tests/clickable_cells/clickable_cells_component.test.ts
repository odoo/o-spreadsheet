import { ClickableCellsStore } from "../../src/components/dashboard/clickable_cell_store";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { toXC, toZone } from "../../src/helpers";
import { clickableCellRegistry } from "../../src/registries/cell_clickable_registry";
import { setCellContent, setViewportOffset } from "../test_helpers/commands_helpers";
import { simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { addToRegistry, mountSpreadsheet, nextTick } from "../test_helpers/helpers";

describe("clickable cells components", () => {
  test("is rendered in the DOM", async () => {
    addToRegistry(clickableCellRegistry, "test", {
      condition: (position, getters) => toXC(position.col, position.row) === "A1",
      execute() {},
      sequence: 1,
    });
    const { model } = await mountSpreadsheet();
    model.updateMode("dashboard");
    await nextTick();
    expect("div.o-dashboard-clickable-cell").toHaveCount(1);
  });

  test("Can click on a link in dashboard mode", async () => {
    const { model, fixture } = await mountSpreadsheet();
    expect(fixture.querySelectorAll(".o-dashboard-clickable-cell")).toHaveLength(0);
    setCellContent(model, "A1", "https://odoo.com");
    model.updateMode("dashboard");
    await nextTick();
    const cells = fixture.querySelectorAll(".o-dashboard-clickable-cell");
    expect(cells).toHaveLength(1);
    const spy = jest.spyOn(window, "open").mockImplementation();
    await simulateClick(cells[0]);
    expect(spy).toHaveBeenCalled();
  });

  test("Clickable cells actions are properly udpated on viewport scroll", async () => {
    const { model } = await mountSpreadsheet();
    const fn = jest.fn();
    addToRegistry(clickableCellRegistry, "fake", {
      condition: (position, getters) => {
        return !!getters.getCell(position)?.content.startsWith("__");
      },
      execute: (position) => fn(position.col, position.row),
      sequence: 5,
    });
    setCellContent(model, "A1", "__test1");
    setCellContent(model, "B10", "__test1");
    model.updateMode("dashboard");
    await nextTick();

    await simulateClick("div.o-dashboard-clickable-cell", 10, 10); // first visible cell
    expect(fn).toHaveBeenCalledWith(0, 0);

    setViewportOffset(
      model,
      DEFAULT_CELL_WIDTH /** scroll to column B */,
      9 * DEFAULT_CELL_HEIGHT /** scroll to row 10 */
    );
    await nextTick();
    await simulateClick("div.o-dashboard-clickable-cell", 10, 10);
    expect(fn).toHaveBeenCalledWith(1, 9);
  });

  test("Triggers clickable cell actions with correct params on left-click and middle-click", async () => {
    const { model } = await mountSpreadsheet();
    const fn = jest.fn();
    addToRegistry(clickableCellRegistry, "fake", {
      condition: (position, getters) => {
        return !!getters.getCell(position)?.content.startsWith("__");
      },
      execute: (_, __, isMiddleClick) => fn(isMiddleClick),
      sequence: 5,
    });
    setCellContent(model, "A1", "__test1");
    model.updateMode("dashboard");
    await nextTick();
    await simulateClick("div.o-dashboard-clickable-cell", 10, 10, { bubbles: true, button: 0 });
    expect(fn).toHaveBeenCalledWith(false);
    await simulateClick("div.o-dashboard-clickable-cell", 10, 10, { bubbles: true, button: 1 });
    expect(fn).toHaveBeenCalledWith(true);
    clickableCellRegistry.remove("fake");
  });

  test("Clickable cells actions can have a tooltip", async () => {
    const { model, fixture } = await mountSpreadsheet();
    addToRegistry(clickableCellRegistry, "fake", {
      condition: () => true,
      execute: () => {},
      title: "hello there",
      sequence: 5,
    });
    model.updateMode("dashboard");
    await nextTick();
    expect(fixture.querySelector("div.o-dashboard-clickable-cell")?.getAttribute("title")).toBe(
      "hello there"
    );
  });

  test("can be hovered", async () => {
    addToRegistry(clickableCellRegistry, "test", {
      condition: (position) => toXC(position.col, position.row) === "A1",
      execute() {},
      hoverStyle: () => [{ zone: toZone("A1"), style: { fillColor: "#0000FF" } }],
      sequence: 1,
    });
    const { model, env } = await mountSpreadsheet();
    const store = env.getStore(ClickableCellsStore);
    model.updateMode("dashboard");
    await nextTick();
    expect(store.hoveredCol).toBeUndefined();
    expect(store.hoveredRow).toBeUndefined();
    triggerMouseEvent(".o-dashboard-clickable-cell", "pointerenter");
    expect(store.hoveredCol).toBe(0);
    expect(store.hoveredRow).toBe(0);
    const sheetId = model.getters.getActiveSheetId();
    expect(store.hoverStyles.get({ sheetId, col: 0, row: 0 })).toEqual({ fillColor: "#0000FF" });
    triggerMouseEvent(".o-dashboard-clickable-cell", "pointerleave");
    expect(store.hoveredCol).toBeUndefined();
    expect(store.hoveredRow).toBeUndefined();
  });
});
