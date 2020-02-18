import { GridModel } from "../../src/model";
import { makeTestFixture, GridParent, nextTick, triggerMouseEvent } from "../helpers";
import { colors } from "../../src/ui/composer";
import { ContentEditableHelper } from "./__mocks__/content_editable_helper";
jest.mock("../../src/ui/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let fixture: HTMLElement;
beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("composer", () => {
  test("starting the edition with enter, the composer should have the focus", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.activeXc).toBe("A1");
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.isEditing).toBe(true);
    expect(model.state.activeRow).toBe(0);
    expect(model.state.activeCol).toBe(0);
    expect(document.activeElement).toBe(fixture.querySelector("div.o-composer")!);
  });

  test("starting the edition with a key stroke =, the composer should have the focus after the key input", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.activeXc).toBe("A1");
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "=" }));
    await nextTick();
    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    expect(composer.textContent).toBe("=");
  });

  test("starting the edition with a key stroke B, the composer should have the focus after the key input", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.activeXc).toBe("A1");
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    await nextTick();
    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    expect(composer.textContent).toBe("b");
  });
  test("type '=', backspace and select a cell should not add it", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "=" }));
    await nextTick();
    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    model.state.currentContent = "";
    const cehMock = parent.grid.comp.composer.comp.contentHelper as ContentEditableHelper;
    cehMock.removeAll();
    composer.dispatchEvent(new Event("keyup"));
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    await nextTick();
    expect(model.state.activeXc).toBe("C8");
    expect(fixture.getElementsByClassName("o-composer")).toHaveLength(0);
  });
  test("type '=', select twice a cell", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "=" }));
    await nextTick();
    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    expect(composer.textContent).toBe("=");
    composer.dispatchEvent(new KeyboardEvent("keyup"));
    expect(model.state.isSelectingRange).toBeTruthy();
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    document.body.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(model.state.isSelectingRange).toBeTruthy();
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    document.body.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composer.textContent).toBe("=C8");
  });
  test("clicking on the composer while typing text (not formula) does not duplicates text", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    await nextTick();
    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    expect(composer.textContent).toBe("a");
    composer.dispatchEvent(new MouseEvent("click"));
    await nextTick();
    expect(composer.textContent).toBe("a");
  });
});

describe("composer highlights color", () => {
  test("colors start with first color", async () => {
    const model = new GridModel();
    model.setValue("A1", "=a1+a2");

    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.highlights.length).toBe(2);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    expect(model.state.highlights[1].color).toBe(colors[1]);
  });

  test("colors always start with first color", async () => {
    const model = new GridModel();
    model.setValue("A1", "=b1+b2");
    model.setValue("A2", "=b1+b3");

    const parent = new GridParent(model);
    await parent.mount(fixture);

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.highlights.length).toBe(2);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    expect(model.state.highlights[1].color).toBe(colors[1]);

    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.highlights.length).toBe(2);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    expect(model.state.highlights[1].color).toBe(colors[1]);
  });
  test("highlight do not duplicate", async () => {
    const model = new GridModel();
    model.setValue("A1", "=a1+a1");

    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.highlights.length).toBe(1);
    expect(model.state.highlights[0].color).toBe(colors[0]);
  });

  test("highlight range", async () => {
    const model = new GridModel();
    model.setValue("A1", "=sum(a1:a10)");

    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.highlights.length).toBe(1);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    expect(composer.textContent).toBe("=sum(a1:a10)");
  });

  test.each(["=A0", "=ZZ1", "=A99"])("Do not highlight invalid ref", async ref => {
    const model = new GridModel();
    model.setValue("A1", ref);

    const parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.highlights.length).toBe(0);
    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    expect(composer.textContent).toBe(ref);
  });
});

describe("ranges and highlights", () => {
  let model: GridModel;
  let composerEl: Element;
  let canvasEl: Element;
  let fixture: HTMLElement;
  let parent;
  async function typeInComposer(text: string) {
    composerEl.append(text);
    composerEl.dispatchEvent(new Event("input"));
    composerEl.dispatchEvent(new Event("keyup"));
    await nextTick();
  }

  beforeEach(async () => {
    fixture = makeTestFixture();
    model = new GridModel();
    parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };
    canvasEl = fixture.querySelector("canvas")!;

    // start composition
    canvasEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    composerEl = fixture.querySelector("div.o-composer")!;
  });

  afterEach(() => {
    fixture.remove();
  });

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
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    triggerMouseEvent("canvas", "mousemove", 200, 200);
    document.body.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 200 }));
    await nextTick();
    expect(model.state.currentContent).toBe("=B8:C8");
    expect(
      (parent.grid.comp.composer.comp.contentHelper as ContentEditableHelper).colors["B8:C8"]
    ).toBe(colors[0]);
  });
});
