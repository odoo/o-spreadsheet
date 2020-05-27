import { Component, hooks, tags } from "@odoo/owl";
import { Model } from "../../src";
import { Spreadsheet } from "../../src/components";
import { args, functionRegistry } from "../../src/functions";
import { makeTestFixture, nextTick } from "../helpers";

const { xml } = tags;
const { useRef } = hooks;

let fixture: HTMLElement;
let parent: Parent;

class Parent extends Component<any> {
  static template = xml`<Spreadsheet t-ref="spreadsheet" data="data"/>`;
  static components = { Spreadsheet };
  private spreadsheet: any = useRef("spreadsheet");
  readonly data: any;
  get model(): Model {
    return this.spreadsheet.comp.model;
  }

  constructor(data?) {
    super();
    this.data = data;
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

  test("Can use the env in a function", () => {
    let env;
    functionRegistry.add("GETACTIVESHEET", {
      description: "Get the name of the current sheet",
      compute: function () {
        env = this.env;
        return "Sheet";
      },
      args: args(``),
      returns: ["STRING"],
    });
    parent.model.dispatch("SET_VALUE", { xc: "A1", text: "=GETACTIVESHEET()" });
    expect(env).toBeTruthy();
  });

  test("Can use the env in a function at model start", async () => {
    let env;
    functionRegistry.add("GETACTIVESHEET", {
      description: "Get the name of the current sheet",
      compute: function () {
        env = this.env;
        return "Sheet";
      },
      args: args(``),
      returns: ["STRING"],
    });
    const parent = new Parent({
      version: 2,
      sheets: [
        {
          name: "Sheet1",
          colNumber: 26,
          rowNumber: 100,
          cells: {
            A1: { content: "=GETACTIVESHEET()" },
          },
          conditionalFormats: [],
        },
      ],
      activeSheet: "Sheet1",
    });
    await parent.mount(fixture);
    expect(env).toBeTruthy();
  });
});
