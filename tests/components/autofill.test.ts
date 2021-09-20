import * as owl from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../src/constants";
import { Model } from "../../src/model";
import { DispatchResult } from "../../src/types/commands";
import { setCellContent } from "../test_helpers/commands_helpers";
import { triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestFixture, nextTick, mountSpreadsheet } from "../test_helpers/helpers";
import { Spreadsheet } from "../../src";

const { Component } = owl;
const { xml } = owl.tags;

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;

beforeEach(async () => {
  fixture = makeTestFixture();
  parent = await mountSpreadsheet(fixture);
  model = parent.model;
});

afterEach(() => {
  fixture.remove();
});

describe("Autofill component", () => {
  test("Can drag and drop autofill on columns", async () => {
    parent.env.dispatch = jest.fn((command) => DispatchResult.Success);
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        parent.env.getters.getCol(parent.env.getters.getActiveSheetId(), 0)!.start +
        10,
      HEADER_HEIGHT + parent.env.getters.getRow(parent.env.getters.getActiveSheetId(), 1)!.end + 10
    );
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL_SELECT", { col: 0, row: 2 });
    triggerMouseEvent(autofill, "mouseup");
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL");
  });

  test("Can drag and drop autofill on rows", async () => {
    parent.env.dispatch = jest.fn((command) => DispatchResult.Success);
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH + parent.env.getters.getCol(parent.env.getters.getActiveSheetId(), 1)!.end + 10,
      HEADER_HEIGHT +
        parent.env.getters.getRow(parent.env.getters.getActiveSheetId(), 0)!.start +
        10
    );
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL_SELECT", { col: 2, row: 0 });
    triggerMouseEvent(autofill, "mouseup");
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL");
  });

  test("Can auto-autofill with dblclick", async () => {
    parent.env.dispatch = jest.fn((command) => DispatchResult.Success);
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "dblclick", 4, 4);
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL_AUTO");
  });

  test("tooltip position when moving the mouse", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const sheetId = parent.env.getters.getActiveSheetId();
    const x = HEADER_WIDTH + parent.env.getters.getCol(sheetId, 1)!.end + 20;
    const y = HEADER_HEIGHT + parent.env.getters.getRow(sheetId, 0)!.start + 20;
    triggerMouseEvent(autofill, "mousemove", x, y);
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toMatchInlineSnapshot(`
      <div
        class="o-autofill-nextvalue"
        style="top:11px;left:235px;"
      >
        <div>
          test
        </div>
      </div>
    `);
  });

  test("tooltip position when scrolling", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const sheetId = parent.env.getters.getActiveSheetId();
    const x = HEADER_WIDTH + parent.env.getters.getCol(sheetId, 1)!.end + 20;
    const y = HEADER_HEIGHT + parent.env.getters.getRow(sheetId, 0)!.start + 20;
    fixture.querySelector(".o-grid")!.dispatchEvent(
      new WheelEvent("wheel", {
        clientX: x,
        clientY: y,
        bubbles: true,
      })
    );
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toMatchInlineSnapshot(`
      <div
        class="o-autofill-nextvalue"
        style="top:11px;left:235px;"
      >
        <div>
          test
        </div>
      </div>
    `);
  });

  test("tooltip position when viewport is not at the top", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 500,
      offsetY: 500,
    });
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const sheetId = parent.env.getters.getActiveSheetId();
    const x = HEADER_WIDTH + parent.env.getters.getCol(sheetId, 1)!.end + 20;
    const y = HEADER_HEIGHT + parent.env.getters.getRow(sheetId, 0)!.start + 20;
    triggerMouseEvent(autofill, "mousemove", x, y);
    await nextTick();
    expect(fixture.querySelector(".o-autofill")).not.toBeNull();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toMatchInlineSnapshot(`
      <div
        class="o-autofill-nextvalue"
        style="top:11px;left:235px;"
      >
        <div>
          test
        </div>
      </div>
    `);
  });

  test("Can display tooltip with autofill", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        parent.env.getters.getCol(parent.env.getters.getActiveSheetId(), 0)!.start +
        10,
      HEADER_HEIGHT + parent.env.getters.getRow(parent.env.getters.getActiveSheetId(), 1)!.end + 10
    );
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeDefined();
    expect(fixture.querySelector(".o-autofill-nextvalue")!.textContent).toBe("test");
  });

  test("Tooltip is removed when cancelling autofill", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        parent.env.getters.getCol(parent.env.getters.getActiveSheetId(), 0)!.start +
        10,
      HEADER_HEIGHT + parent.env.getters.getRow(parent.env.getters.getActiveSheetId(), 1)!.end + 10
    );
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeDefined();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        parent.env.getters.getCol(parent.env.getters.getActiveSheetId(), 0)!.start +
        10,
      HEADER_HEIGHT +
        parent.env.getters.getRow(parent.env.getters.getActiveSheetId(), 0)!.start +
        10
    );
    await nextTick();
    triggerMouseEvent(autofill, "mouseup");
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
  });

  test("Can display tooltip with a custom component", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    class CustomTooltip extends Component {
      static template = xml/* xml */ `
        <div class="custom_tooltip" t-esc="props.content"/>
      `;
    }
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    parent.env.getters.getAutofillTooltip = jest.fn(() => {
      return {
        props: { content: "blabla" },
        component: CustomTooltip,
      };
    });
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        parent.env.getters.getCol(parent.env.getters.getActiveSheetId(), 0)!.start +
        10,
      HEADER_HEIGHT + parent.env.getters.getRow(parent.env.getters.getActiveSheetId(), 1)!.end + 10
    );
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeDefined();
    expect(fixture.querySelector(".custom_tooltip")).toBeDefined();
    expect(fixture.querySelector(".custom_tooltip")!.textContent).toBe("blabla");
  });

  test("Autofill on the last col/row", async () => {
    parent.env.dispatch = jest.fn((command) => DispatchResult.Success);
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        parent.env.getters.getCol(parent.env.getters.getActiveSheetId(), 0)!.start +
        10000,
      HEADER_HEIGHT +
        parent.env.getters.getRow(parent.env.getters.getActiveSheetId(), 1)!.start +
        10000
    );
    await nextTick();
    expect(parent.env.dispatch).not.toHaveBeenCalled();
  });
});
