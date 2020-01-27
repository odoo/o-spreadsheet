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
    const model = new GridModel();
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
    const model = new GridModel();
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
    const model = new GridModel();
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
    const model = new GridModel();
    model.setValue("A1", "=a1+a2");

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
    const model = new GridModel();
    model.setValue("A1", "=b1+b2");
    model.setValue("A2", "=b1+b3");

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
    const model = new GridModel();
    model.setValue("A1", "=a1+a1");

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
    const model = new GridModel();
    model.setValue("A1", "=sum(a1:a10)");

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
});
