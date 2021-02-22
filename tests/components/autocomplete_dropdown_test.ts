import { args, functionRegistry } from "../../src/functions/index";
import { Model } from "../../src/model";
import { getCellText } from "../getters_helpers";
import {
  GridParent,
  makeTestFixture,
  nextTick,
  resetFunctions,
  startGridComposition,
  typeInComposer as typeInComposerHelper,
} from "../helpers";
import { ContentEditableHelper } from "./__mocks__/content_editable_helper";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let model: Model;
let composerEl: Element;
let fixture: HTMLElement;
let parent: any;
async function typeInComposer(text: string, fromScratch: boolean = true) {
  if (fromScratch) {
    composerEl = await startGridComposition();
  }
  await typeInComposerHelper(composerEl, text);
}

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new Model();
  parent = new GridParent(model);
  await parent.mount(fixture);

  // start composition
  parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  await nextTick();
  composerEl = fixture.querySelector(".o-grid div.o-composer")!;
});

afterEach(() => {
  parent.destroy();
  fixture.remove();
});

describe("Functions autocomplete", () => {
  beforeEach(() => {
    resetFunctions();
    functionRegistry.add("IF", {
      description: "do if",
      args: args(``),
      compute: () => 1,
      returns: ["ANY"],
    });
    functionRegistry.add("SUM", {
      description: "do sum",
      args: args(``),
      compute: () => 1,
      returns: ["ANY"],
    });
    functionRegistry.add("SZZ", {
      description: "do something",
      args: args(``),
      compute: () => 1,
      returns: ["ANY"],
    });
  });

  describe("autocomplete", () => {
    test("= do not show autocomplete", async () => {
      await typeInComposer("=");
      const activeElement = document.activeElement;
      expect(activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test("simple snapshot with =S", async () => {
      await typeInComposer("=S");
      expect(fixture.querySelector(".o-autocomplete-dropdown")).toMatchSnapshot();
    });

    test("=S show autocomplete functions starting with S", async () => {
      await typeInComposer("=S");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(2);
      expect(fixture.querySelectorAll(".o-autocomplete-value")[0].textContent).toBe("SUM");
      expect(fixture.querySelectorAll(".o-autocomplete-value")[1].textContent).toBe("SZZ");
    });

    test("=S+TAB complete the function --> =sum(␣", async () => {
      await typeInComposer("=S");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await nextTick();
      expect(model.getters.getCurrentContent()).toBe("=SUM(␣");
    });

    test("=S+ENTER complete the function --> =sum(␣", async () => {
      await typeInComposer("=S");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await nextTick();
      expect(model.getters.getCurrentContent()).toBe("=SUM(␣");
    });

    test("=SX not show autocomplete (nothing matches SX)", async () => {
      await typeInComposer("=SX");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test("=SX+ENTER does not autocomplete anything and moves to the cell down", async () => {
      await typeInComposer("=SX");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await nextTick();
      expect(getCellText(model, "A1")).toBe("=SX");
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
        functionRegistry.add(`SUM${i + 1}`, {
          description: "do sum",
          args: args(``),
          compute: () => 1,
          returns: ["ANY"],
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
      expect(composerEl.textContent).toBe("=SZZ(␣");
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
      expect(model.getters.getCurrentContent()).toBe("=IF(␣");
    });
    test("= and CTRL+Space & DOWN move to next autocomplete", async () => {
      await typeInComposer("=");
      composerEl.dispatchEvent(new KeyboardEvent("keyup", { key: " ", ctrlKey: true }));
      await nextTick();
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      await nextTick();
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
    });
  });
});

describe("Autocomplete parenthesis", () => {
  beforeAll(() => {
    resetFunctions();
    functionRegistry.add("IF", {
      description: "do if",
      args: args(``),
      compute: () => 1,
      returns: ["ANY"],
    });
    functionRegistry.add("SUM", {
      description: "do sum",
      args: args(``),
      compute: () => 1,
      returns: ["ANY"],
    });
    functionRegistry.add("SZZ", {
      description: "do something",
      args: args(``),
      compute: () => 1,
      returns: ["ANY"],
    });
  });

  test("=sum(1,2 + enter adds closing parenthesis", async () => {
    await typeInComposer("=sum(1,2");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(getCellText(model, "A1")).toBe("=sum(1,2)");
  });

  test("=sum(1,2) + enter + edit sum does not add parenthesis", async () => {
    await typeInComposer("=sum(1,2)");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    model.dispatch("SELECT_CELL", { col: 0, row: 0 });
    //edit A1
    parent.grid.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    composerEl = fixture.querySelector(".o-grid div.o-composer")!;
    // @ts-ignore
    const cehMock = window.mockContentHelper as ContentEditableHelper;
    // select SUM
    cehMock.selectRange(1, 4);
    // replace SUM with if
    cehMock.insertText("if", "black");
    composerEl.dispatchEvent(new KeyboardEvent("keydown"));
    composerEl.dispatchEvent(new Event("input"));
    composerEl.dispatchEvent(new KeyboardEvent("keyup"));
    await nextTick();
    expect(model.getters.getCurrentContent()).toBe("=if(1,2)");
  });

  test("=S( + edit S with autocomplete does not add left parenthesis", async () => {
    await typeInComposer("=S(");
    // go behind the letter "S"
    model.dispatch("STOP_COMPOSER_SELECTION");
    model.dispatch("CHANGE_COMPOSER_SELECTION", { start: 2, end: 2 });
    await nextTick();
    // show autocomplete
    await typeInComposer("U", false);
    expect(model.getters.getCurrentContent()).toBe("=SU(");
    expect(model.getters.getComposerSelection()).toEqual({ start: 3, end: 3 });
    expect(document.activeElement).toBe(composerEl);
    expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(1);
    // select the SUM function
    fixture.querySelector(".o-autocomplete-value-focus")!.dispatchEvent(new MouseEvent("click"));
    await nextTick();
    expect(model.getters.getCurrentContent()).toBe("=SUM(␣");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
  });

  test("=sum(sum(1,2 + enter add 2 closing parenthesis", async () => {
    await typeInComposer("=sum(sum(1,2");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(getCellText(model, "A1")).toBe("=sum(sum(1,2))");
  });

  test("=sum(sum(1,2) + enter add 1 closing parenthesis", async () => {
    await typeInComposer("=sum(sum(1,2");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(getCellText(model, "A1")).toBe("=sum(sum(1,2))");
  });

  test("=sum(sum(1,2) + click outside composer should add the missing parenthesis", async () => {
    await typeInComposer("=sum(sum(1,2");

    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    await nextTick();
    expect(getCellText(model, "A1")).toBe("=sum(sum(1,2))");
  });

  test('=sum("((((((((") + enter should not complete the parenthesis in the string', async () => {
    await typeInComposer('=sum("((((((((")');
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(getCellText(model, "A1")).toBe('=sum("((((((((")');
  });

  test("=s + tab should allow to select a ref", async () => {
    await typeInComposer("=s");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("selecting");
  });
});

describe("autocomplete parameters", () => {});
describe("custom autocomplete", () => {});
