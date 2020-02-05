import { GridModel, CURRENT_VERSION } from "../../src/model/index";
import { makeTestFixture, nextTick } from "../helpers";
import { TopBar } from "../../src/ui/top_bar";
import { Component, tags } from "@odoo/owl";

const { xml } = tags;

let fixture: HTMLElement;

class Parent extends Component<any, any> {
  static template = xml`<TopBar model="model" t-on-ask-confirmation="askConfirmation"/>`;
  static components = { TopBar };
  model: GridModel;
  constructor(model: GridModel) {
    super();
    this.model = model;
  }
  askConfirmation(ev) {}
  mounted() {
    this.model.on("update", this, this.render);
  }

  willUnmount() {
    this.model.off("update", this);
  }
}

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("TopBar component", () => {
  test("merging destructively a selection ask for confirmation", async () => {
    const model = new GridModel();
    model.setValue("B2", "b2");

    let confirm;
    class TestParent extends Parent {
      askConfirmation(ev) {
        confirm = ev.detail.confirm;
      }
    }
    model.updateSelection(5, 5);
    const parent = new TestParent(model);
    await parent.mount(fixture);

    fixture.querySelector('.o-tool[title="Merge Cells"]')!.dispatchEvent(new Event("click"));

    expect(model.state.merges).toEqual({});
    confirm();
    expect(model.state.merges).not.toEqual({});
  });

  test("opening a second menu closes the first one", async () => {
    const model = new GridModel();
    model.setValue("B2", "b2");
    const parent = new Parent(model);
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    fixture.querySelector('span[title="Text Color"]')!.dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll(".o-line-item").length).not.toBe(0);
    fixture
      .querySelector('.o-tool[title="Horizontal align"] span')!
      .dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll(".o-color-line").length).toBe(0);
  });

  test("merging cell button state is correct", async () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["A1:B1"]
        }
      ]
    });
    const parent = new Parent(model);
    await parent.mount(fixture);
    const mergeTool = fixture.querySelector('.o-tool[title="Merge Cells"]')!;
    expect(mergeTool.classList.contains("active")).toBeTruthy();

    // increase the selection to A2 (so, it is now A1:B2) => merge tool
    // shoul not be active
    model.updateSelection(0, 1);
    await nextTick();
    expect(mergeTool.classList.contains("active")).toBeFalsy();
  });

  test("multiple selection zones => merge tools is disabled", async () => {
    const model = new GridModel();
    model.setValue("B2", "b2");

    const parent = new Parent(model);
    await parent.mount(fixture);
    const mergeTool = fixture.querySelector('.o-tool[title="Merge Cells"]')!;

    // should be disabled, because the selection is just one cell
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();

    model.updateSelection(1, 0);
    await nextTick();
    // should be enabled, because two cells are selected
    expect(mergeTool.classList.contains("o-disabled")).toBeFalsy();

    model.selectCell(3, 3, true);
    await nextTick();
    // should be disabled, because multiple zones are selected
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();
  });

  test("undo/redo tools", async () => {
    const model = new GridModel();

    const parent = new Parent(model);
    await parent.mount(fixture);
    const undoTool = fixture.querySelector('.o-tool[title="Undo"]')!;
    const redoTool = fixture.querySelector('.o-tool[title="Redo"]')!;

    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeTruthy();

    model.setStyle({ bold: true });
    await nextTick();

    expect(undoTool.classList.contains("o-disabled")).toBeFalsy();
    expect(redoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(model.state.cells.A1.style).toBeDefined();

    undoTool.dispatchEvent(new Event("click"));
    await nextTick();
    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeFalsy();
    expect(model.state.cells.A1).not.toBeDefined();
  });

  test("paint format tools", async () => {
    const model = new GridModel();

    const parent = new Parent(model);
    await parent.mount(fixture);
    const paintFormatTool = fixture.querySelector('.o-tool[title="Paint Format"]')!;

    expect(paintFormatTool.classList.contains("active")).toBeFalsy();

    paintFormatTool.dispatchEvent(new Event("click"));
    await nextTick();

    expect(paintFormatTool.classList.contains("active")).toBeTruthy();
  });

  test("can clear formatting", async () => {
    const model = new GridModel();
    model.selectCell(1, 0);
    model.setBorder("all");

    expect(model.state.cells.B1.border).toBeDefined();
    const parent = new Parent(model);
    await parent.mount(fixture);
    const clearFormatTool = fixture.querySelector('.o-tool[title="Clear Format"]')!;
    clearFormatTool.dispatchEvent(new Event("click"));
    expect(model.state.cells.B1).not.toBeDefined();
  });
});
