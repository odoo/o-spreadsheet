import { App } from "@odoo/owl";
import { Spreadsheet } from "../../src";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  FILTER_ICON_MARGIN,
  ICON_EDGE_LENGTH,
} from "../../src/constants";
import { Model } from "../../src/model";
import { createFilter, setCellContent } from "../test_helpers/commands_helpers";
import { simulateClick } from "../test_helpers/dom_helper";
import { getActiveXc } from "../test_helpers/getters_helpers";
import { makeTestFixture, mountSpreadsheet, nextTick } from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;
let app: App;

describe("Grid component in dashboard mode", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    ({ app, parent } = await mountSpreadsheet(fixture));
    model = parent.model;
    model.updateMode("dashboard");
    await nextTick();
  });

  afterEach(() => {
    app.destroy();
    fixture.remove();
  });

  test("simple dashboard rendering snapshot", async () => {
    expect(fixture.querySelector(".o-grid")).toMatchSnapshot();
  });

  test("Keyboard event are not dispatched in dashboard mode", async () => {
    expect(getActiveXc(model)).toBe("A1");
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(getActiveXc(model)).not.toBe("B1");
  });

  test("Can click on a link in dashboard mode", async () => {
    expect(fixture.querySelectorAll(".o-dashboard-clickable-cell")).toHaveLength(0);
    model.updateMode("normal");
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
    model.updateMode("normal");
    createFilter(model, "B2:C3");
    model.updateMode("dashboard");
    await nextTick();
    const icons = fixture.querySelectorAll(".o-filter-icon");
    expect(icons).toHaveLength(2);
    const centerIngOffset = (DEFAULT_CELL_HEIGHT - ICON_EDGE_LENGTH) / 2;
    const top = `${DEFAULT_CELL_HEIGHT * 2 - ICON_EDGE_LENGTH - centerIngOffset}px`;
    const leftA = `${DEFAULT_CELL_WIDTH * 2 - ICON_EDGE_LENGTH - FILTER_ICON_MARGIN}px`;
    const leftB = `${DEFAULT_CELL_WIDTH * 3 - ICON_EDGE_LENGTH - FILTER_ICON_MARGIN}px`;
    expect((icons[0] as HTMLElement).style["_values"]).toEqual({ top, left: leftA });
    expect((icons[1] as HTMLElement).style["_values"]).toEqual({ top, left: leftB });
  });

  test("Clicking on a filter icon correctly open context menu", async () => {
    model.updateMode("normal");
    createFilter(model, "A1:A2");
    model.updateMode("dashboard");
    await nextTick();
    await simulateClick(".o-filter-icon");
    expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);
  });
});
