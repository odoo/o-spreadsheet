import { Spreadsheet } from "../../src";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  FILTER_ICON_EDGE_LENGTH,
  FILTER_ICON_MARGIN,
} from "../../src/constants";
import { Model } from "../../src/model";
import { createFilter, selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { simulateClick } from "../test_helpers/dom_helper";
import { getActiveXc } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick, spyDispatch } from "../test_helpers/helpers";

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
    await nextTick();
  });

  test("simple dashboard rendering snapshot", async () => {
    model.updateMode("dashboard");
    await nextTick();
    expect(fixture.querySelector(".o-grid")).toMatchSnapshot();
  });

  test("Keyboard event are not dispatched in dashboard mode", async () => {
    expect(getActiveXc(model)).toBe("A1");
    model.updateMode("dashboard");
    await nextTick();
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(getActiveXc(model)).not.toBe("B1");
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
    createFilter(model, "B2:C3");
    model.updateMode("dashboard");
    await nextTick();
    const icons = fixture.querySelectorAll(".o-filter-icon");
    expect(icons).toHaveLength(2);
    const centerIngOffset = (DEFAULT_CELL_HEIGHT - FILTER_ICON_EDGE_LENGTH) / 2;
    const top = `${DEFAULT_CELL_HEIGHT * 2 - FILTER_ICON_EDGE_LENGTH - centerIngOffset}px`;
    const leftA = `${DEFAULT_CELL_WIDTH * 2 - FILTER_ICON_EDGE_LENGTH - FILTER_ICON_MARGIN - 1}px`;
    const leftB = `${DEFAULT_CELL_WIDTH * 3 - FILTER_ICON_EDGE_LENGTH - FILTER_ICON_MARGIN - 1}px`;
    expect((icons[0] as HTMLElement).style["_values"]).toEqual({ top, left: leftA });
    expect((icons[1] as HTMLElement).style["_values"]).toEqual({ top, left: leftB });
  });

  test("Clicking on a filter icon correctly open the filter popover", async () => {
    createFilter(model, "A1:A2");
    model.updateMode("dashboard");
    await nextTick();
    await simulateClick(".o-filter-icon");
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);
  });

  test("Clicking on a filter icon correctly closes the filter popover", async () => {
    createFilter(model, "A1:A2");
    model.updateMode("dashboard");
    await nextTick();
    await simulateClick(".o-filter-icon");
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);

    await nextTick();
    await simulateClick(".o-filter-icon");
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(0);
  });

  test("When filter menu is open, clicking on a random grid correctly closes filter popover", async () => {
    createFilter(model, "A1:A2");
    model.updateMode("dashboard");
    await nextTick();
    await simulateClick(".o-filter-icon");
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
});
