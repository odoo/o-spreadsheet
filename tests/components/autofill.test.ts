import { App, Component, xml } from "@odoo/owl";
import { Spreadsheet } from "../../src";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../src/constants";
import { Model } from "../../src/model";
import { setCellContent } from "../test_helpers/commands_helpers";
import { triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestFixture, mountSpreadsheet, nextTick, spyDispatch } from "../test_helpers/helpers";

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;
let app: App;

beforeEach(async () => {
  fixture = makeTestFixture();
  ({ app, parent } = await mountSpreadsheet(fixture));
  model = parent.model;
});

afterEach(() => {
  fixture.remove();
  app.destroy();
});

describe("Autofill component", () => {
  test("Can drag and drop autofill on columns", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        parent.model.getters.getColInfo(parent.model.getters.getActiveSheetId(), 0)!.start +
        10,
      HEADER_HEIGHT +
        parent.model.getters.getRowInfo(parent.model.getters.getActiveSheetId(), 1)!.end +
        10
    );
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL_SELECT", { col: 0, row: 2 });
    triggerMouseEvent(autofill, "mouseup");
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL");
  });

  test("Can drag and drop autofill on rows", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        parent.model.getters.getColInfo(parent.model.getters.getActiveSheetId(), 1)!.end +
        10,
      HEADER_HEIGHT +
        parent.model.getters.getRowInfo(parent.model.getters.getActiveSheetId(), 0)!.start +
        10
    );
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL_SELECT", { col: 2, row: 0 });
    triggerMouseEvent(autofill, "mouseup");
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL");
  });

  test("Can auto-autofill with dblclick", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "dblclick", 4, 4);
    await nextTick();
    expect(dispatch).toHaveBeenCalledWith("AUTOFILL_AUTO");
  });

  test("tooltip position when moving the mouse", async () => {
    const autofill = fixture.querySelector(".o-autofill");
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    setCellContent(model, "A1", "test");
    await nextTick();
    triggerMouseEvent(autofill, "mousedown", 40, 40);
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).toBeNull();
    const sheetId = parent.model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + parent.model.getters.getColInfo(sheetId, 1)!.end + 20;
    const y = HEADER_HEIGHT + parent.model.getters.getRowInfo(sheetId, 0)!.start + 20;
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
    const sheetId = parent.model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + parent.model.getters.getColInfo(sheetId, 1)!.end + 20;
    const y = HEADER_HEIGHT + parent.model.getters.getRowInfo(sheetId, 0)!.start + 20;
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
    const sheetId = parent.model.getters.getActiveSheetId();
    const x = HEADER_WIDTH + parent.model.getters.getColInfo(sheetId, 1)!.end + 20;
    const y = HEADER_HEIGHT + parent.model.getters.getRowInfo(sheetId, 0)!.start + 20;
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
        parent.model.getters.getColInfo(parent.model.getters.getActiveSheetId(), 0)!.start +
        10,
      HEADER_HEIGHT +
        parent.model.getters.getRowInfo(parent.model.getters.getActiveSheetId(), 1)!.end +
        10
    );
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).not.toBeNull();
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
        parent.model.getters.getColInfo(parent.model.getters.getActiveSheetId(), 0)!.start +
        10,
      HEADER_HEIGHT +
        parent.model.getters.getRowInfo(parent.model.getters.getActiveSheetId(), 1)!.end +
        10
    );
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).not.toBeNull();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        parent.model.getters.getColInfo(parent.model.getters.getActiveSheetId(), 0)!.start +
        10,
      HEADER_HEIGHT +
        parent.model.getters.getRowInfo(parent.model.getters.getActiveSheetId(), 0)!.start +
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
    parent.model.getters.getAutofillTooltip = jest.fn(() => {
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
        parent.model.getters.getColInfo(parent.model.getters.getActiveSheetId(), 0)!.start +
        10,
      HEADER_HEIGHT +
        parent.model.getters.getRowInfo(parent.model.getters.getActiveSheetId(), 1)!.end +
        10
    );
    await nextTick();
    expect(fixture.querySelector(".o-autofill-nextvalue")).not.toBeNull();
    expect(fixture.querySelector(".custom_tooltip")).not.toBeNull();
    expect(fixture.querySelector(".custom_tooltip")!.textContent).toBe("blabla");
  });

  test("Autofill on the last col/row", async () => {
    const dispatch = spyDispatch(parent);
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "mousedown", 4, 4);
    await nextTick();
    triggerMouseEvent(
      autofill,
      "mousemove",
      HEADER_WIDTH +
        parent.model.getters.getColInfo(parent.model.getters.getActiveSheetId(), 0)!.start +
        10000,
      HEADER_HEIGHT +
        parent.model.getters.getRowInfo(parent.model.getters.getActiveSheetId(), 1)!.start +
        10000
    );
    await nextTick();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
