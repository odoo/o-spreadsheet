import { GridModel } from "../../src/model";
import { GridParent, makeTestFixture, nextTick, resetFunctions } from "../helpers";
import { addFunction } from "../../src/functions";
import { args } from "../../src/functions/arguments";
import { ContentEditableHelper } from "./__mocks__/content_editable_helper";
jest.mock("../../src/ui/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let model: GridModel;
let composerEl: Element;
let canvasEl: Element;
let fixture: HTMLElement;
let parent: any;
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

describe("Functions autocomplete", () => {
  beforeEach(() => {
    resetFunctions();
    addFunction("IF", { description: "do if", args: args``, compute: () => 1, returns: ["ANY"] });
    addFunction("SUM", { description: "do sum", args: args``, compute: () => 1, returns: ["ANY"] });
    addFunction("SZZ", {
      description: "do something",
      args: args``,
      compute: () => 1,
      returns: ["ANY"]
    });
  });

  describe("autocomplete", () => {
    test("= do not show autocomplete", async () => {
      await typeInComposer("=");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test("=S show autocomplete functions starting with S", async () => {
      await typeInComposer("=S");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(2);
      expect(fixture.querySelectorAll(".o-autocomplete-value")[0].textContent).toBe("SUM");
      expect(fixture.querySelectorAll(".o-autocomplete-value")[1].textContent).toBe("SZZ");
    });

    test("=S+TAB complete the function --> =sum(", async () => {
      await typeInComposer("=S");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await nextTick();
      expect(model.state.currentContent).toBe("=SUM(");
    });

    test("=S+ENTER complete the function --> =sum(", async () => {
      await typeInComposer("=S");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await nextTick();
      expect(model.state.currentContent).toBe("=SUM(");
    });

    test("=SX not show autocomplete (nothing matches SX)", async () => {
      await typeInComposer("=SX");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test("=SX+ENTER does not autocomplete anything and moves to the cell down", async () => {
      await typeInComposer("=SX");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await nextTick();
      expect(model.state.cells["A1"].content).toBe("=SX");
    });

    test("=S+UP cycle to the last item", async () => {
      await typeInComposer("=S");
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      await nextTick();
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SZZ");
    });

    test("=+DOWN+UP move to next/previous autocomplete", async () => {
      await typeInComposer("=S");
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      await nextTick();
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SZZ");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      await nextTick();
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
    });

    test("=+DOWN+DOWN cycle to the first item", async () => {
      await typeInComposer("=S");
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      await nextTick();
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SZZ");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      await nextTick();
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
    });

    test("autocomplete restrict number of proposition to 10", async () => {
      for (let i = 0; i < 20; i++) {
        addFunction(`SUM${i + 1}`, {
          description: "do sum",
          args: args``,
          compute: () => 1,
          returns: ["ANY"]
        });
      }

      await typeInComposer("=S");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(10);
    });

    test("click on a autocomplete does the autocomplete", async () => {
      await typeInComposer("=S");
      fixture
        .querySelector(".o-autocomplete-dropdown")!
        .children[1].dispatchEvent(new MouseEvent("click"));
      await nextTick();
      expect(composerEl.textContent).toBe("=SZZ(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });
  });

  describe("autocomplete functions SUM IF", () => {
    test("empty not show autocomplete", async () => {
      await typeInComposer("");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });
    test("=a3 not show autocomplete (its a ref)", async () => {
      await typeInComposer("=a3");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });
    test("=a3+ does not show autocomplete (we didn't start typing on the next token", async () => {
      await typeInComposer("=a3+");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });
    test("=sum(s show autocomplete", async () => {
      await typeInComposer("=sum(s");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(2);
    });
    test("= and CTRL+Space show autocomplete", async () => {
      await typeInComposer("=");
      composerEl.dispatchEvent(new KeyboardEvent("keyup", { key: " ", ctrlKey: true }));
      await nextTick();
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(3);
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await nextTick();
      expect(model.state.currentContent).toBe("=IF(");
    });
  });
});

describe("Autocomplete parenthesis", () => {
  beforeAll(() => {
    resetFunctions();
    addFunction("IF", { description: "do if", args: args``, compute: () => 1, returns: ["ANY"] });
    addFunction("SUM", { description: "do sum", args: args``, compute: () => 1, returns: ["ANY"] });
    addFunction("SZZ", {
      description: "do something",
      args: args``,
      compute: () => 1,
      returns: ["ANY"]
    });
  });

  test("=sum(1,2 + enter adds closing parenthesis", async () => {
    await typeInComposer("=sum(1,2");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.cells["A1"].content).toBe("=sum(1,2)");
  });
  test("=sum(1,2) + enter + edit sum does not add parenthesis", async () => {
    await typeInComposer("=sum(1,2)");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    model.selectCell(0, 0);
    //edit A1
    model.startEditing();
    await nextTick();
    const cehMock = parent.grid.comp.composer.comp.contentHelper as ContentEditableHelper;
    // select SUM
    cehMock.selectRange(1, 4);
    // replace SUM with if
    cehMock.insertText("if", "black");
    composerEl.dispatchEvent(new KeyboardEvent("keydown"));
    composerEl.dispatchEvent(new Event("input"));
    composerEl.dispatchEvent(new KeyboardEvent("keyup"));
    await nextTick();
    expect(model.state.currentContent).toBe("=if(1,2)");
  });
  test("=sum(sum(1,2 + enter add 2 closing parenthesis", async () => {
    await typeInComposer("=sum(sum(1,2");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.cells["A1"].content).toBe("=sum(sum(1,2))");
  });
  test("=sum(sum(1,2) + enter add 1 closing parenthesis", async () => {
    await typeInComposer("=sum(sum(1,2");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.cells["A1"].content).toBe("=sum(sum(1,2))");
  });

  test("=sum(sum(1,2) + click outside composer should add the missing parenthesis", async () => {
    await typeInComposer("=sum(sum(1,2");

    model.selectCell(1, 1);
    await nextTick();
    expect(model.state.cells["A1"].content).toBe("=sum(sum(1,2))");
  });
  test("=sum('((((((((') + enter should not complete the parenthesis in the string", async () => {
    await typeInComposer("=sum('((((((((')");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(model.state.cells["A1"].content).toBe("=sum('((((((((')");
  });
  test("=s + tab should allow to select a ref", async () => {
    await typeInComposer("=s");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    await nextTick();
    expect(model.state.isSelectingRange).toBeTruthy();
  });
});

describe("autocomplete parameters", () => {});
describe("custom autocomplete", () => {});
