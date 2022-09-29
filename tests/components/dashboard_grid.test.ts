import { App } from "@odoo/owl";
import { Spreadsheet } from "../../src";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { dashboardMenuRegistry } from "../../src/registries";
import { clickCell, rightClickCell } from "../test_helpers/dom_helper";
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

  test("Open context menu in dashboard mode contains only items of dashboard registry", async () => {
    dashboardMenuRegistry.add("A", {
      name: "A",
      sequence: 10,
      isReadonlyAllowed: true,
      action: () => {},
    });
    await nextTick();
    await rightClickCell(model, "B2");
    expect(fixture.querySelectorAll(".o-menu div")).toHaveLength(1);
    expect(fixture.querySelector(".o-menu div[data-name='A']")).not.toBeNull();
    dashboardMenuRegistry.remove("A");
  });

  test("Keyboard event are not dispatched in dashboard mode", async () => {
    await clickCell(model, "H1");
    expect(getActiveXc(model)).toBe("H1");
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(getActiveXc(model)).not.toBe("I1");
  });

  describe("Single selection event is dispatched in dashoboard mode", () => {
    let fn: jest.Mock<any, any>;
    beforeEach(async () => {
      fn = jest.fn();
      model.selection.observe(model, {
        handleEvent: fn,
      });
    });
    test("Clicking on a cell in dashboard mode dispatch selection event", async () => {
      await clickCell(model, "H1");
      expect(fn).toHaveBeenCalledWith({
        type: "ZonesSelected",
        anchor: {
          cell: {
            col: 7,
            row: 0,
          },
          zone: toZone("H1"),
        },
        mode: "overrideSelection",
        previousAnchor: {
          cell: {
            col: 0,
            row: 0,
          },
          zone: toZone("A1"),
        },
      });
    });

    test("CTRL+Clicking on a cell in dashboard mode dispatch single selection event", async () => {
      await clickCell(model, "H1", { ctrlKey: true });
      expect(fn).toHaveBeenCalledWith({
        type: "ZonesSelected",
        anchor: {
          cell: {
            col: 7,
            row: 0,
          },
          zone: toZone("H1"),
        },
        mode: "overrideSelection",
        previousAnchor: {
          cell: {
            col: 0,
            row: 0,
          },
          zone: toZone("A1"),
        },
      });
    });

    test("SHIFT+Clicking on a cell in dashboard mode dispatch single selection event", async () => {
      await clickCell(model, "H1", { shiftKey: true });
      expect(fn).toHaveBeenCalledWith({
        type: "ZonesSelected",
        anchor: {
          cell: {
            col: 7,
            row: 0,
          },
          zone: toZone("H1"),
        },
        mode: "overrideSelection",
        previousAnchor: {
          cell: {
            col: 0,
            row: 0,
          },
          zone: toZone("A1"),
        },
      });
    });
  });
});
