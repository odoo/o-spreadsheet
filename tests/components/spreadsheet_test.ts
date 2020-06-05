import { Component, tags, hooks } from "@odoo/owl";
import { Spreadsheet } from "../../src/components";
import { makeTestFixture, nextTick, getCell } from "../helpers";
import { functionRegistry, args } from "../../src/functions";
import { Model } from "../../src";

const { xml } = tags;
const { useRef } = hooks;

let fixture: HTMLElement;
let parent: Parent;

class Parent extends Component<any> {
  static template = xml`<Spreadsheet t-ref="spreadsheet"/>`;
  static components = { Spreadsheet };
  private spreadsheet: any = useRef("spreadsheet");
  get model(): Model {
    return this.spreadsheet.comp.model;
  }
}

beforeEach(async () => {
  fixture = makeTestFixture();
  parent = new Parent();
  await parent.mount(fixture);
});

afterEach(() => {
  fixture.remove();
});

describe("Spreadsheet", () => {
  test("simple rendering snapshot", async () => {
    expect(fixture.querySelector(".o-spreadsheet")).toMatchSnapshot();
  });

  test("focus is properly set, initially and after switching sheet", async () => {
    expect(document.activeElement!.tagName).toEqual("CANVAS");
    document.querySelector(".o-add-sheet")!.dispatchEvent(new Event("click"));
    // simulate the fact that a user clicking on the add sheet button will
    // move the focus to the document.body
    (document.activeElement as any).blur();
    await nextTick();
    expect(document.querySelectorAll(".o-sheet").length).toBe(2);
    expect(document.activeElement!.tagName).toEqual("CANVAS");
  });

  test("Can use getters from the env in a function", () => {
    functionRegistry.add("GETACTIVESHEET", {
      description: "Get the name of the current sheet",
      compute: function () {
        return (this as any).env.getters.getActiveSheet();
      },
      args: args``,
      returns: ["STRING"],
    });
    parent.model.dispatch("SET_VALUE", { xc: "A1", text: "=GETACTIVESHEET()" });
    expect(getCell(parent.model, "A1")!.value).toBe(parent.model.getters.getActiveSheet());
  });
});
