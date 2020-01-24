import { GridModel } from "../../src/model";
import { makeTestFixture, GridParent, nextTick } from "../helpers";
import { colors } from "../../src/ui/composer";
jest.mock("../../src/ui/contentEditableHelper", () => require("./__mocks__/contentEditableHelper"));

let fixture: HTMLElement;
beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("composer", () => {
  test("starting the edition with enter, the composer should have the focus", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.activeXc).toBe("A1");
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    await nextTick();
    expect(model.state.isEditing).toBe(true);
    expect(model.state.activeRow).toBe(0);
    expect(model.state.activeCol).toBe(0);
    expect(document.activeElement).toBe(fixture.querySelector("div.o-composer")!);
  });
  test("starting the edition with a key stroke =, the composer should have the focus after the key input", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.activeXc).toBe("A1");
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "=" }));
    await nextTick();
    await nextTick();
    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    expect(composer.innerText).toBe("=");
  });
  test("starting the edition with a key stroke B, the composer should have the focus after the key input", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.activeXc).toBe("A1");
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    await nextTick();
    await nextTick();
    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    expect(composer.innerText).toBe("b");
  });
});

describe("composer highlights color", () => {
  test("colors start with first color", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "=a1+a2" }
          }
        }
      ]
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    await nextTick();
    expect(model.state.highlights.length).toBe(2);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    expect(model.state.highlights[1].color).toBe(colors[1]);
  });

  test("colors always start with first color", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "=b1+b2" },
            A2: { content: "=b1+b3" }
          }
        }
      ]
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    await nextTick();
    expect(model.state.highlights.length).toBe(2);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    expect(model.state.highlights[1].color).toBe(colors[1]);

    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    await nextTick();
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    await nextTick();
    expect(model.state.highlights.length).toBe(2);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    expect(model.state.highlights[1].color).toBe(colors[1]);
  });
  test("highlight do not duplicate", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "=a1+a1" }
          }
        }
      ]
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    await nextTick();
    expect(model.state.highlights.length).toBe(1);
    expect(model.state.highlights[0].color).toBe(colors[0]);
  });

  test("highlight range", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "=sum(a1:a10)" }
          }
        }
      ]
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    await nextTick();
    expect(model.state.highlights.length).toBe(1);
    expect(model.state.highlights[0].color).toBe(colors[0]);
    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    expect(composer.innerText).toBe("=SUM(A1:A10)");
  });

  test("highlight variable after editing the cell", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { }
        }
      ]
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.highlights.length).toBe(0);

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();

    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    composer.textContent = "=A2";
    composer.dispatchEvent(new Event("input"));
    await nextTick();
    composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    model.movePosition(0, -1);
    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.sheets[0].cells["A1"].content).toBe("=A2");
    expect(model.state.highlights.length).toBe(1);
    expect(model.state.highlights[0].color).toBe(colors[0]);

    composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    expect(composer.innerText).toBe("=A2");
  });

  test("Test Range Selections", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { }
        }
      ]
    });
    const parent = new GridParent(model);
    await parent.mount(fixture);
    // todo: find a way to have actual width/height instead of this
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    expect(model.state.highlights.length).toBe(0);

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    // Composer opened
    expect(fixture.getElementsByClassName("o-composer").length).toBe(1);

    model.selectCell(1, 0);
    await nextTick();
    // Composer closed
    expect(fixture.getElementsByClassName("o-composer").length).toBe(0);

    fixture.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();

    let composer = fixture.getElementsByClassName("o-composer")[0] as HTMLElement;
    composer.textContent = "=";
    composer.dispatchEvent(new Event("input"));
    await nextTick();

    model.selectCell(1, 1);
    await nextTick();

    expect(composer.textContent).toBe("=B2");


  });
});
