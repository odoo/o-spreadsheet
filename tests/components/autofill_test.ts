import * as owl from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../src/constants";
import { Model } from "../../src/model";
import { CommandResult } from "../../src/types/commands";
import { triggerMouseEvent } from "../dom_helper";
import { GridParent, makeTestFixture, nextTick, setCellContent } from "../helpers";

const { Component } = owl;
const { xml } = owl.tags;

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

let fixture: HTMLElement;
let model: Model;
let parent: GridParent;

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new Model();
  parent = new GridParent(model);
  await parent.mount(fixture);
});

afterEach(() => {
  fixture.remove();
});

describe("Autofill component", () => {
  test("Can drag and drop autofill on columns", async () => {
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
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
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
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
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
    const autofill = fixture.querySelector(".o-autofill");
    triggerMouseEvent(autofill, "dblclick", 4, 4);
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("AUTOFILL_AUTO");
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
    parent.env.dispatch = jest.fn((command) => ({ status: "SUCCESS" } as CommandResult));
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
