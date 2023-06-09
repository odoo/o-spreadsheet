import { args, functionRegistry } from "../../src/functions/index";
import { Model } from "../../src/model";
import { selectCell } from "../test_helpers/commands_helpers";
import { clickCell } from "../test_helpers/dom_helper";
import { getCellText } from "../test_helpers/getters_helpers";
import {
  clearFunctions,
  mountSpreadsheet,
  nextTick,
  restoreDefaultFunctions,
  typeInComposerGrid as typeInComposerGridHelper,
} from "../test_helpers/helpers";
import { ContentEditableHelper } from "./__mocks__/content_editable_helper";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let model: Model;
let composerEl: Element;
let fixture: HTMLElement;
let cehMock: ContentEditableHelper;

async function typeInComposerGrid(text: string, fromScratch: boolean = true) {
  const composerEl = await typeInComposerGridHelper(text, fromScratch);
  // @ts-ignore
  cehMock = window.mockContentHelper;
  await nextTick();
  return composerEl;
}

beforeEach(async () => {
  ({ model, fixture } = await mountSpreadsheet());

  // start composition
  fixture.querySelector(".o-grid")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  await nextTick();
  composerEl = fixture.querySelector(".o-grid div.o-composer")!;
});

describe("Functions autocomplete", () => {
  beforeEach(() => {
    clearFunctions();
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

  afterAll(() => {
    restoreDefaultFunctions();
  });

  describe("autocomplete", () => {
    test("= do not show autocomplete", async () => {
      await typeInComposerGrid("=");
      const activeElement = document.activeElement;
      expect(activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test("simple snapshot with =S", async () => {
      await typeInComposerGrid("=S");
      expect(fixture.querySelector(".o-autocomplete-dropdown")).toMatchSnapshot();
    });

    test("=S show autocomplete functions starting with S", async () => {
      await typeInComposerGrid("=S");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(2);
      expect(fixture.querySelectorAll(".o-autocomplete-value")[0].textContent).toBe("SUM");
      expect(fixture.querySelectorAll(".o-autocomplete-value")[1].textContent).toBe("SZZ");
    });

    test("=S+TAB complete the function --> =SUM(␣", async () => {
      await typeInComposerGrid("=S");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(5);
    });

    test("=S+ENTER complete the function --> =SUM(␣", async () => {
      await typeInComposerGrid("=S");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(5);
    });

    test("=SX not show autocomplete (nothing matches SX)", async () => {
      await typeInComposerGrid("=SX");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test("=SX+ENTER does not autocomplete anything and moves to the cell down", async () => {
      await typeInComposerGrid("=SX");
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await nextTick();
      expect(getCellText(model, "A1")).toBe("=SX");
    });

    test("=S+UP cycle to the last item", async () => {
      await typeInComposerGrid("=S");
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
      await typeInComposerGrid("=S");
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
      await typeInComposerGrid("=S");
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

      await typeInComposerGrid("=S");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(10);
    });

    test("click on a autocomplete does the autocomplete", async () => {
      await typeInComposerGrid("=S");
      fixture
        .querySelector(".o-autocomplete-dropdown")!
        .children[1].dispatchEvent(new MouseEvent("click"));
      await nextTick();
      expect(composerEl.textContent).toBe("=SZZ(");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(5);
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test.each(["Enter", "Tab"])(
      "=S(A1:A5) +ENTER complete the function --> =SUM(A1:A5)",
      async (buttonkey) => {
        await typeInComposerGrid("=S(A1:A5)");
        model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
        model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 2, end: 2 });
        await nextTick();
        await typeInComposerGrid("U", false);
        expect(model.getters.getCurrentContent()).toBe("=SU(A1:A5)");
        expect(model.getters.getComposerSelection()).toEqual({ start: 3, end: 3 });
        expect(document.activeElement).toBe(composerEl);
        expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(1);
        await nextTick();
        composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: buttonkey }));
        await nextTick();
        expect(composerEl.textContent).toBe("=SUM(A1:A5)");
      }
    );
  });

  describe("autocomplete functions SUM IF", () => {
    test("empty not show autocomplete", async () => {
      await typeInComposerGrid("");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });
    test("=a3 not show autocomplete (its a ref)", async () => {
      await typeInComposerGrid("=a3");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });
    test("=a3+ does not show autocomplete (we didn't start typing on the next token", async () => {
      await typeInComposerGrid("=a3+");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });
    test("=sum(s show autocomplete", async () => {
      await typeInComposerGrid("=sum(s");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(2);
    });
    test("= and CTRL+Space show autocomplete", async () => {
      await typeInComposerGrid("=");
      composerEl.dispatchEvent(new KeyboardEvent("keyup", { key: " ", ctrlKey: true }));
      await nextTick();
      //TODO Need a second nextTick to wait the re-render of SelectionInput (onMounted => uuid assignation). But why not before ?
      await nextTick();
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(3);
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await nextTick();
      expect(composerEl.textContent).toBe("=IF(");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(4);
    });
    test("= and CTRL+Space & DOWN move to next autocomplete", async () => {
      await typeInComposerGrid("=");
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
    clearFunctions();
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
    functionRegistry.add("SUMIF", {
      description: "do sumif",
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

  afterAll(() => {
    restoreDefaultFunctions();
  });

  test("=sum(1,2 + enter adds closing parenthesis", async () => {
    await typeInComposerGrid("=sum(1,2");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(getCellText(model, "A1")).toBe("=sum(1,2)");
  });

  test("=sum(1,2) + enter + edit sum does not add parenthesis", async () => {
    await typeInComposerGrid("=sum(1,2)");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    selectCell(model, "A1");
    //edit A1
    fixture.querySelector(".o-grid")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    composerEl = fixture.querySelector(".o-grid div.o-composer")!;
    // @ts-ignore
    const cehMock = window.mockContentHelper as ContentEditableHelper;
    // select SUM
    cehMock.selectRange(1, 4);
    // replace SUM with if
    cehMock.insertText("if", { color: "black" });
    composerEl.dispatchEvent(new KeyboardEvent("keydown"));
    composerEl.dispatchEvent(new Event("input"));
    composerEl.dispatchEvent(new KeyboardEvent("keyup"));
    await nextTick();
    expect(model.getters.getCurrentContent()).toBe("=if(1,2)");
  });

  test("=S( + edit S with autocomplete does not add left parenthesis", async () => {
    await typeInComposerGrid("=S(");
    // go behind the letter "S"
    model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 2, end: 2 });
    await nextTick();
    // show autocomplete
    await typeInComposerGrid("U", false);
    expect(model.getters.getCurrentContent()).toBe("=SU(");
    expect(model.getters.getComposerSelection()).toEqual({ start: 3, end: 3 });
    expect(document.activeElement).toBe(composerEl);
    expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(2);
    // select the SUM function
    fixture.querySelector(".o-autocomplete-value-focus")!.dispatchEvent(new MouseEvent("click"));
    await nextTick();
    expect(composerEl.textContent).toBe("=SUM(");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(5);
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
  });

  test.each(["Enter", "Tab"])(
    "=SUM( + edit SUM with autocomplete does not add left parenthesis",
    async (buttonkey) => {
      await typeInComposerGrid("=SUM(");
      // go behind the letter "M"
      model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 4, end: 4 });
      await nextTick();
      // show autocomplete
      await typeInComposerGrid("I", false);
      expect(model.getters.getCurrentContent()).toBe("=SUMI(");
      expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(1);
      // select the SUMIF function
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: buttonkey }));
      await nextTick();
      expect(composerEl.textContent).toBe("=SUMIF(");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(7);
      expect(model.getters.getComposerSelection()).toEqual({ start: 7, end: 7 });
    }
  );

  test("=sum(sum(1,2 + enter add 2 closing parenthesis", async () => {
    await typeInComposerGrid("=sum(sum(1,2");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(getCellText(model, "A1")).toBe("=sum(sum(1,2))");
  });

  test("=sum(sum(1,2) + enter add 1 closing parenthesis", async () => {
    await typeInComposerGrid("=sum(sum(1,2");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(getCellText(model, "A1")).toBe("=sum(sum(1,2))");
  });

  test("=sum(sum(1,2) + click outside composer should add the missing parenthesis", async () => {
    await typeInComposerGrid("=sum(sum(1,2");
    clickCell(model, "B2");
    await nextTick();
    expect(getCellText(model, "A1")).toBe("=sum(sum(1,2))");
  });

  test('=sum("((((((((") + enter should not complete the parenthesis in the string', async () => {
    await typeInComposerGrid('=sum("((((((((")');
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    expect(getCellText(model, "A1")).toBe('=sum("((((((((")');
  });

  test("=s + tab should allow to select a ref", async () => {
    await typeInComposerGrid("=s");
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("selecting");
  });
});

describe("autocomplete parameters", () => {});
describe("custom autocomplete", () => {});
