import { Align, Spreadsheet } from "../../src";
import { CHECKBOX_CHECKED } from "../../src/components/icons/icons";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  MIN_CELL_TEXT_MARGIN,
} from "../../src/constants";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { clickableCellRegistry } from "../../src/registries/cell_clickable_registry";
import { GridIcon, iconsOnCellRegistry } from "../../src/registries/icons_on_cell_registry";
import {
  createTableWithFilter,
  selectCell,
  setCellContent,
  setViewportOffset,
} from "../test_helpers/commands_helpers";
import { clickGridIcon, keyDown, simulateClick } from "../test_helpers/dom_helper";
import { getCellIcons, getSelectionAnchorCellXc } from "../test_helpers/getters_helpers";
import { addToRegistry, mountSpreadsheet, nextTick, spyDispatch } from "../test_helpers/helpers";

let fixture: HTMLElement;
let parent: Spreadsheet;
let model: Model;

function getEmptyClipboardEvent(type: "copy" | "paste" | "cut") {
  const event = new Event(type, { bubbles: true });
  //@ts-ignore
  event.clipboardData = {
    getData: () => "",
    setData: () => {},
    types: ["text/plain"],
  };
  return event;
}

describe("Grid component in dashboard mode", () => {
  beforeEach(async () => {
    ({ parent, fixture, model } = await mountSpreadsheet());
  });

  test("simple dashboard rendering snapshot", async () => {
    model.updateMode("dashboard");
    await nextTick();
    expect(fixture.querySelector(".o-grid")).toMatchSnapshot();
  });

  test("Keyboard event are not dispatched in dashboard mode", async () => {
    model.updateMode("dashboard");
    await nextTick();
    expect(getSelectionAnchorCellXc(model)).toBe("A1");
    keyDown({ key: "ArrowRight" });
    expect(getSelectionAnchorCellXc(model)).not.toBe("B1");
  });

  test("Can click on a link in dashboard mode", async () => {
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

  test("Filter icon is correctly rendered", async () => {
    createTableWithFilter(model, "B2:C3");
    model.updateMode("dashboard");
    await nextTick();

    const y = DEFAULT_CELL_HEIGHT + 1 + MIN_CELL_TEXT_MARGIN; // +1 to skip grid lines
    const leftB = DEFAULT_CELL_WIDTH * 2 - GRID_ICON_EDGE_LENGTH - GRID_ICON_MARGIN;
    const leftC = DEFAULT_CELL_WIDTH * 3 - GRID_ICON_EDGE_LENGTH - GRID_ICON_MARGIN;

    const iconB = getCellIcons(model, "B2")[0];
    const rectB = model.getters.getCellIconRect(iconB, model.getters.getRect(toZone("B2")));
    expect(rectB).toMatchObject({ y, x: leftB });
    const iconC = getCellIcons(model, "C2")[0];
    const rectC = model.getters.getCellIconRect(iconC, model.getters.getRect(toZone("C2")));
    expect(rectC).toMatchObject({ y, x: leftC });
  });

  test("Clicking on a filter icon correctly open the filter popover", async () => {
    createTableWithFilter(model, "A1:A2");
    model.updateMode("dashboard");
    await nextTick();
    await clickGridIcon(model, "A1");
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);
  });

  test("Clicking on a filter icon correctly closes the filter popover", async () => {
    createTableWithFilter(model, "A1:A2");
    model.updateMode("dashboard");
    await nextTick();
    await clickGridIcon(model, "A1");
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);

    await nextTick();
    await clickGridIcon(model, "A1");
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(0);
  });

  test("When filter menu is open, clicking on a random grid correctly closes filter popover", async () => {
    createTableWithFilter(model, "A1:A2");
    model.updateMode("dashboard");
    await nextTick();
    await clickGridIcon(model, "A1");
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);

    await nextTick();
    await simulateClick(".o-grid-overlay");
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(0);
  });

  test("Clipboard event do nothing in dashboard mode", async () => {
    model.updateMode("dashboard");
    await nextTick();
    const spy = spyDispatch(parent);
    setCellContent(model, "A1", "things");
    selectCell(model, "A1");
    document.body.dispatchEvent(getEmptyClipboardEvent("copy"));
    expect(spy).not.toHaveBeenCalledWith("COPY");
    selectCell(model, "A2");
    document.body.dispatchEvent(getEmptyClipboardEvent("paste"));
    expect(spy).not.toHaveBeenCalledWith("PASTE");
  });

  test("Clickable cells actions are properly udpated on viewport scroll", async () => {
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

  test("Clickable cell actions are computed only once per cell", async () => {
    const fn = jest.fn();
    clickableCellRegistry.add("fake", {
      condition: (position, getters) => {
        if (position.col === 0 && position.row === 0) {
          fn();
        }
        return false;
      },
      execute: (position) => {},
      sequence: 5,
    });
    setCellContent(model, "A1", "coucou");
    model.updateMode("dashboard");
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    clickableCellRegistry.remove("fake");
  });

  test("Triggers clickable cell actions with correct params on left-click and middle-click", async () => {
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
  });

  test("Clickable cells actions can have a generic tooltip", async () => {
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

  test("Clickable cells actions can have a tooltip based on their position", async () => {
    addToRegistry(clickableCellRegistry, "fake", {
      condition: () => true,
      execute: () => {},
      title: (position, getters) => `hello ${getters.getCell(position)?.content}`,
      sequence: 5,
    });
    setCellContent(model, "A1", "Magical Françoise");
    model.updateMode("dashboard");
    await nextTick();
    expect(fixture.querySelector("div.o-dashboard-clickable-cell")?.getAttribute("title")).toBe(
      "hello Magical Françoise"
    );
  });

  const TEST_GRID_ICON: GridIcon = {
    horizontalAlign: "left",
    size: 20,
    margin: 2,
    type: "debug_icon",
    position: { sheetId: "s1", col: 0, row: 0 },
    priority: 1,
    svg: CHECKBOX_CHECKED,
    onClick: () => {},
  };

  test("Clickable cell size is reduced based on the icon on the cell", async () => {
    let horizontalAlign: Exclude<Align, undefined> = "center";

    addToRegistry(clickableCellRegistry, "fake", {
      condition: (position, getters) => position.row === 0 && position.col === 0,
      execute: () => () => {},
      sequence: 5,
    });
    addToRegistry(iconsOnCellRegistry, "test_icon", (getters, position) =>
      position.col === 0 && position.row === 0 ? { ...TEST_GRID_ICON, horizontalAlign } : undefined
    );

    model.updateMode("dashboard");
    await nextTick();

    expect("div.o-dashboard-clickable-cell").toHaveCount(0); // because center icon => no clickable cell

    horizontalAlign = "right";
    model.dispatch("EVALUATE_CELLS");
    await nextTick();
    expect("div.o-dashboard-clickable-cell").toHaveStyle({
      left: "0px",
      width: DEFAULT_CELL_WIDTH - TEST_GRID_ICON.size - TEST_GRID_ICON.margin + "px",
      height: DEFAULT_CELL_HEIGHT + "px",
    });

    horizontalAlign = "left";
    model.dispatch("EVALUATE_CELLS");
    await nextTick();
    expect("div.o-dashboard-clickable-cell").toHaveStyle({
      left: 20 + 2 + "px",
      width: DEFAULT_CELL_WIDTH - TEST_GRID_ICON.size - TEST_GRID_ICON.margin + "px",
      height: DEFAULT_CELL_HEIGHT + "px",
    });
  });

  test("Clickable cell size is not reduced if the icon has no onClick action", async () => {
    addToRegistry(clickableCellRegistry, "fake", {
      condition: (position, getters) => position.row === 0 && position.col === 0,
      execute: () => () => {},
      sequence: 5,
    });
    addToRegistry(iconsOnCellRegistry, "test_icon", (getters, position) =>
      position.col === 0 && position.row === 0
        ? { ...TEST_GRID_ICON, onClick: undefined }
        : undefined
    );

    model.updateMode("dashboard");
    await nextTick();
    await nextTick(); // Need to wait one render to have correct grid position with the resize observers

    expect("div.o-dashboard-clickable-cell").toHaveStyle({
      left: "0px",
      width: DEFAULT_CELL_WIDTH + "px",
      height: DEFAULT_CELL_HEIGHT + "px",
    });
  });
});
