import { GridModel } from "../../src/model/index";
import { makeTestFixture, GridParent, nextTick } from "../helpers";
import { colors } from "../../src/components/composer";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("composer", () => {
  test("starting the edition of the cell, the composer should have the focus", async () => {
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
});
