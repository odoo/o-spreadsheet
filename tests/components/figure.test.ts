import { Component, tags } from "@odoo/owl";
import { Model } from "../../src";
import { corePluginRegistry } from "../../src/plugins";
import { CorePlugin } from "../../src/plugins/core_plugin";
import { figureRegistry } from "../../src/registries/figure_registry";
import { Figure, UID } from "../../src/types";
import { BaseCommand, Command } from "../../src/types/commands";
import { SpreadsheetEnv } from "../../src/types/env";
import { activateSheet, selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { simulateClick } from "../test_helpers/dom_helper";
import { getCellContent } from "../test_helpers/getters_helpers";
import { GridParent, makeTestFixture, nextTick } from "../test_helpers/helpers";

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
    selectCell(model, "A1");
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
    activateSheet(model, "42");
    await nextTick();
    expect(fixture.querySelectorAll(".o-figure")).toHaveLength(1);
  });

  test("Can move a figure with keyboard", async () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_TEXT_FIGURE", {
      sheetId,
      id: "someuuid",
      text: "Hello",
    });
    let figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({ id: "someuuid", x: 1, y: 1 });
    await nextTick();
    const figureContainer = fixture.querySelector(".o-figure")!;
    await simulateClick(".o-figure");
    await nextTick();
    const selectedFigure = model.getters.getSelectedFigureId();
    expect(selectedFigure).toBe("someuuid");
    //down
    figureContainer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    figureContainer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    await nextTick();
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({ id: "someuuid", x: 1, y: 3 });
    //right
    figureContainer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    figureContainer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    await nextTick();
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({ id: "someuuid", x: 3, y: 3 });
    //left
    figureContainer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    );
    await nextTick();
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({ id: "someuuid", x: 2, y: 3 });
    //up
    figureContainer.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await nextTick();
    figure = model.getters.getFigure(sheetId, "someuuid");
    expect(figure).toMatchObject({ id: "someuuid", x: 2, y: 2 });
  });

  test("select a figure, it should have the  resize handles", async () => {
    model.dispatch("CREATE_TEXT_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      text: "Hello",
    });
    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    await nextTick();
    const anchors = fixture.querySelectorAll(".o-anchor");
    expect(anchors).toHaveLength(8);
  });
});
