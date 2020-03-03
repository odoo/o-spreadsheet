import { GridModel } from "../../src/model";
import { nextTick, makeTestFixture, GridParent, triggerMouseEvent } from "../helpers";
import { ContentEditableHelper } from "./__mocks__/content_editable_helper";
import { colors } from "../../src/ui/composer";
jest.mock("../../src/ui/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let model: GridModel;
let composerEl: Element;
let canvasEl: Element;
let fixture: HTMLElement;
let parent: GridParent;

async function typeInComposer(text: string, fromScratch: boolean = true) {
  if (fromScratch) {
    await startComposition();
  }
  composerEl.append(text);
  composerEl.dispatchEvent(new Event("input"));
  composerEl.dispatchEvent(new Event("keyup", { bubbles: true }));
  await nextTick();
}

async function startComposition(key: string = "Enter") {
  canvasEl.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  await nextTick();
  composerEl = fixture.querySelector("div.o-composer")!;
}

async function keydown(key: string, options: any = {}) {
  composerEl.dispatchEvent(
    new KeyboardEvent("keydown", Object.assign({ key, bubbles: true }, options))
  );
  await nextTick();
}

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new GridModel();
  parent = new GridParent(model);
  await parent.mount(fixture);
  model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };
  canvasEl = parent.grid.el;
});

afterEach(() => {
  fixture.remove();
});

describe("ranges and highlights", () => {
  test("=+Click Cell, the cell ref should be colored", async () => {
    await typeInComposer("=");
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    document.body.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(model.state.currentContent).toBe("=C8");
    expect(
      (parent.grid.comp.composer.comp.contentHelper as ContentEditableHelper).colors["C8"]
    ).toBe(colors[0]);
  });

  test("=+Click range, the range ref should be colored", async () => {
    await typeInComposer("=");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    triggerMouseEvent("canvas", "mousemove", 200, 200);
    document.body.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 200 }));
    await nextTick();
    expect(model.state.currentContent).toBe("=B8:C8");
    expect(
      (parent.grid.comp.composer.comp.contentHelper as ContentEditableHelper).colors["B8:C8"]
    ).toBe(colors[0]);
  });

  test("=Key DOWN in A1, should select and highlight A2", async () => {
    await typeInComposer("=");
    await keydown("ArrowDown");
    expect(model.state.currentContent).toBe("=A2");
  });

  test("=Key DOWN+DOWN in A1, should select and highlight A3", async () => {
    await typeInComposer("=");
    await keydown("ArrowDown");
    await keydown("ArrowDown");
    expect(model.state.currentContent).toBe("=A3");
  });
  test("=Key RIGHT in A1, should select and highlight B1", async () => {
    await typeInComposer("=");
    await keydown("ArrowRight");
    expect(model.state.currentContent).toBe("=B1");
  });
  test("=Key UP in B2, should select and highlight B1", async () => {
    model.selectCell(1, 1);
    await typeInComposer("=");
    await keydown("ArrowUp");
    expect(model.state.currentContent).toBe("=B1");
  });
  test("=Key LEFT in B2, should select and highlight A2", async () => {
    model.selectCell(1, 1);
    await typeInComposer("=");
    await keydown("ArrowLeft");
    expect(model.state.currentContent).toBe("=A2");
  });
  test("=Key DOWN and UP in B2, should select and highlight B2", async () => {
    model.selectCell(1, 1);
    await typeInComposer("=");
    await keydown("ArrowDown");
    await keydown("ArrowUp");
    expect(model.state.currentContent).toBe("=B2");
  });
  test("=key UP 2 times and key DOWN in B2, should select and highlight B2", async () => {
    model.selectCell(1, 1);
    await typeInComposer("=");
    await keydown("ArrowUp");
    await keydown("ArrowUp");
    await keydown("ArrowDown");
    expect(model.state.currentContent).toBe("=B2");
  });
  test("While selecting a ref, Shift+UP/DOWN/LEFT/RIGHT extend the range selection and updates the composer", async () => {
    await typeInComposer("=");
    await keydown("ArrowDown");
    expect(model.state.currentContent).toBe("=A2");
    await keydown("ArrowDown", { shiftKey: true });
    expect(model.state.currentContent).toBe("=A2:A3");
    await keydown("ArrowRight", { shiftKey: true });
    expect(model.state.currentContent).toBe("=A2:B3");
    await keydown("ArrowUp", { shiftKey: true });
    expect(model.state.currentContent).toBe("=A2:B2");
    await keydown("ArrowLeft", { shiftKey: true });
    expect(model.state.currentContent).toBe("=A2");
  });
  test("Create a ref with merges with keyboard -> the merge should be treated as one cell", async () => {
    model.selectCell(1, 1);
    model.moveSelection(1, 1);
    model.merge(); // merges from B2 to C3
    model.selectCell(2, 0);
    await typeInComposer("=");
    await keydown("ArrowDown");
    expect(model.state.currentContent).toBe("=B2");
    expect(model.state.highlights).toHaveLength(1);
    expect(model.state.highlights[0].zone).toMatchObject({ top: 1, bottom: 2, left: 1, right: 2 });
    await keydown("ArrowDown");
    expect(model.state.currentContent).toBe("=C4");
  });
});

describe("composer", () => {
  test("starting the edition with enter, the composer should have the focus", async () => {
    await startComposition();
    expect(model.state.isEditing).toBe(true);
    expect(model.state.activeRow).toBe(0);
    expect(model.state.activeCol).toBe(0);
    expect(document.activeElement).toBe(fixture.querySelector("div.o-composer")!);
  });

  test("starting the edition with a key stroke =, the composer should have the focus after the key input", async () => {
    await startComposition("=");
    expect(composerEl.textContent).toBe("=");
  });

  test("starting the edition with a key stroke B, the composer should have the focus after the key input", async () => {
    await startComposition("b");
    expect(composerEl.textContent).toBe("b");
  });
  test("type '=', backspace and select a cell should not add it", async () => {
    await typeInComposer("=");
    model.state.currentContent = "";
    const cehMock = parent.grid.comp.composer.comp.contentHelper as ContentEditableHelper;
    cehMock.removeAll();
    composerEl.dispatchEvent(new Event("keyup"));
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    await nextTick();
    expect(model.state.activeXc).toBe("C8");
    expect(fixture.getElementsByClassName("o-composer")).toHaveLength(0);
  });
  test("type '=', select twice a cell", async () => {
    await typeInComposer("=");
    expect(model.state.isSelectingRange).toBeTruthy();
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    document.body.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(model.state.isSelectingRange).toBeTruthy();
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    document.body.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=C8");
  });
  test("clicking on the composer while typing text (not formula) does not duplicates text", async () => {
    await typeInComposer("a");
    composerEl.dispatchEvent(new MouseEvent("click"));
    await nextTick();
    expect(composerEl.textContent).toBe("a");
  });
  test("typing incorrect formula then enter exits the edit mode and moves to the next cell down", async () => {
    await startComposition();
    await typeInComposer("=qsdf");
    await keydown("Enter");
    expect(model.state.cells["A1"].content).toBe("=qsdf");
    expect(model.state.cells["A1"].value).toBe("#BAD_EXPR");
  });
  test("typing text then enter exits the edit mode and moves to the next cell down", async () => {
    await startComposition();
    await typeInComposer("qsdf");
    await keydown("Enter");
    expect(model.state.cells["A1"].content).toBe("qsdf");
    expect(model.state.cells["A1"].value).toBe("qsdf");
  });
  test("typing CTRL+C does not type C in the cell", async () => {
    canvasEl.dispatchEvent(
      new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true })
    );
    await nextTick();
    expect(model.state.currentContent).toBe("");
  });
});

describe("composer highlights color", () => {
  test("colors start with first color", async () => {
    model.setValue("A1", "=a1+a2");
    await startComposition();
    expect(model.state.highlights.length).toBe(2);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    expect(model.state.highlights[1].color).toBe(colors[1]);
  });

  test("colors always start with first color", async () => {
    model.setValue("A1", "=b1+b2");
    model.setValue("A2", "=b1+b3");
    await startComposition();
    expect(model.state.highlights.length).toBe(2);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    expect(model.state.highlights[1].color).toBe(colors[1]);

    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    canvasEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.highlights.length).toBe(2);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    expect(model.state.highlights[1].color).toBe(colors[1]);
  });
  test("highlight do not duplicate", async () => {
    model.setValue("A1", "=a1+a1");
    await startComposition();
    expect(model.state.highlights.length).toBe(1);
    expect(model.state.highlights[0].color).toBe(colors[0]);
  });

  test("highlight range", async () => {
    model.setValue("A1", "=sum(a1:a10)");
    await startComposition();
    expect(model.state.highlights.length).toBe(1);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    expect(composerEl.textContent).toBe("=sum(a1:a10)");
  });

  test("highlight 'reverse' ranges", async () => {
    model.setValue("A1", "=sum(B3:a1)");
    await startComposition();
    expect(model.state.highlights[0].zone).toEqual({ left: 0, right: 1, top: 0, bottom: 2 });
  });

  test.each(["=A0", "=ZZ1", "=A101"])("Do not highlight invalid ref", async ref => {
    model.setValue("A1", ref);
    await startComposition();
    expect(model.state.highlights.length).toBe(0);
    expect(composerEl.textContent).toBe(ref);
  });
});
