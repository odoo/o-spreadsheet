import { Model } from "../../src";
import { corePluginRegistry } from "../../src/plugins";
import { CorePlugin } from "../../src/plugins/core_plugin";
import { BaseCommand, Command, Figure, SpreadsheetEnv, UID } from "../../src/types";
import { simulateClick } from "../dom_helper";
import { nextTick, getCellContent, GridParent, setCellContent, makeTestFixture } from "../helpers";
import { Component, tags } from "@odoo/owl";
import { figureRegistry } from "../../src/registries/figure_registry";

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

let fixture: HTMLElement;
let model;
let parent: GridParent;

//Test Plugin
interface CreateTextFigure extends BaseCommand {
  type: "CREATE_TEXT_FIGURE";
  id: string;
  sheetId: UID;
  text: string;
}
type TestCommands = Command | CreateTextFigure;

class PluginTestFigureText extends CorePlugin {
  readonly textFigures = {};
  static getters = ["getTextFigures"];

  handle(cmd: TestCommands) {
    switch (cmd.type) {
      case "CREATE_TEXT_FIGURE":
        this.dispatch("CREATE_FIGURE", {
          sheetId: cmd.sheetId,
          figure: {
            id: cmd.id,
            x: 1,
            y: 1,
            height: 100,
            width: 100,
            tag: "text",
          },
        });
        this.textFigures[cmd.id] = cmd.text;
    }
  }
  getTextFigures() {
    return this.textFigures;
  }
}
corePluginRegistry.add("testFigureText", PluginTestFigureText);

//Test Composant
const { xml } = tags;

const TEMPLATE = xml/* xml */ `
  <div class="o-fig-text">
    <t t-esc="getText()"/>
  </div>
`;

interface Props {
  figure: Figure;
}
class TextFigure extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  getText() {
    //@ts-ignore
    const texts = this.env.getters.getTextFigures();
    return texts[this.props.figure.id];
  }
}

figureRegistry.add("text", { Component: TextFigure });

describe("figures", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    model = new Model();
    parent = new GridParent(model);
    await parent.mount(fixture);
  });

  afterEach(() => {
    parent.unmount();
  });

  test("can create a figure with some data", () => {
    model.dispatch("CREATE_TEXT_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      text: "Hello",
    });
    const data = model.exportData();
    const sheet = data.sheets.find((s) => s.id === model.getters.getActiveSheetId())!;

    expect(sheet.figures).toEqual([
      { id: "someuuid", height: 100, tag: "text", width: 100, x: 1, y: 1 },
    ]);
  });
  test("focus a figure", async () => {
    model.dispatch("CREATE_TEXT_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      text: "Hello",
    });
    await nextTick();
    expect(fixture.querySelector(".o-figure")).toBeDefined();
    await simulateClick(".o-figure");
    expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
  });

  test("deleting a figure focuses the canvas", async () => {
    model.dispatch("CREATE_TEXT_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      text: "Hello",
    });
    await nextTick();
    const figure = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    expect(document.activeElement).toBe(figure);
    figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    await nextTick();
    expect(fixture.querySelector(".o-figure")).toBeNull();
    expect(document.activeElement).toBe(fixture.querySelector("canvas"));
  });

  test("deleting a figure doesn't delete selection", async () => {
    model.dispatch("CREATE_TEXT_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      text: "Hello",
    });
    setCellContent(model, "A1", "content");
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    await nextTick();
    const figure = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    await nextTick();
    expect(fixture.querySelector(".o-figure")).toBeNull();
    expect(getCellContent(model, "A1")).toBe("content");
  });

  test("Add a figure on sheet2, scroll down on sheet 1, switch to sheet 2, the figure should be displayed", async () => {
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    model.dispatch("CREATE_TEXT_FIGURE", {
      sheetId: "42",
      id: "someuuid",
      text: "Hello",
    });
    fixture.querySelector(".o-grid")!.dispatchEvent(new WheelEvent("wheel", { deltaX: 1500 }));
    fixture.querySelector(".o-scrollbar.vertical")!.dispatchEvent(new Event("scroll"));
    await nextTick();
    model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: model.getters.getActiveSheetId(),
      sheetIdTo: "42",
    });
    await nextTick();
    expect(fixture.querySelectorAll(".o-figure")).toHaveLength(1);
  });
});
