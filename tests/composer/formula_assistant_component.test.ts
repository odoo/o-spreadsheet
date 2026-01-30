import { _t } from "@odoo/o-spreadsheet-engine";
import { arg } from "@odoo/o-spreadsheet-engine/functions/arguments";
import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
import { setTranslationMethod } from "../../src";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { Store } from "../../src/store_engine";
import { DEFAULT_LOCALE } from "../../src/types";
import { registerCleanup } from "../setup/jest.setup";
import { updateLocale } from "../test_helpers/commands_helpers";
import { click, getTextNodes, keyDown, keyUp } from "../test_helpers/dom_helper";
import {
  ComposerWrapper,
  addToRegistry,
  clearFunctions,
  getInputSelection,
  mountComposerWrapper,
  nextTick,
  typeInComposerHelper,
} from "../test_helpers/helpers";

let composerEl: Element;
let fixture: HTMLElement;
let parent: ComposerWrapper;
let composerStore: Store<CellComposerStore>;

const queryFormulaArgName =
  ".o-formula-assistant-arg .o-formula-assistant-focus span:first-child span:first-child";
const queryFormulaArgsName = ".o-formula-assistant-arg .o-formula-assistant-focus span";

async function moveCursorToLeftInSelection(offset: number, expectedToken: string) {
  for (const _ in Array.from({ length: offset })) {
    await keyDown({ key: "ArrowLeft" });
  }
  const selection = document.getSelection()!;
  const range = selection.getRangeAt(0);
  const textNodes = getTextNodes(composerEl);
  const textNode = textNodes.at(-(offset + 1))!;
  expect(textNode.textContent).toBe(expectedToken);
  range.setStart(textNode, 1);
  range.setEnd(textNode, 1);
  await keyUp({ key: "ArrowLeft" });
}

async function typeInComposer(text: string, fromScratch: boolean = true) {
  if (fromScratch) {
    parent.startComposition();
  }
  await typeInComposerHelper("div.o-composer", text, false);
}

beforeEach(async () => {
  ({ fixture, parent } = await mountComposerWrapper());
  // start composition
  parent.startComposition();
  await nextTick();
  composerEl = fixture.querySelector("div.o-composer")!;
  composerStore = parent.env.getStore(CellComposerStore);
});

describe("formula assistant", () => {
  beforeEach(() => {
    clearFunctions();
    addToRegistry(functionRegistry, "FUNC0", {
      description: "func without args",
      args: [],
      compute: () => {
        return { value: 1 };
      },
    });
    setTranslationMethod(
      (str, ...values) => str,
      () => false
    );
    addToRegistry(functionRegistry, "FUNC1", {
      description: "func1 def",
      args: [arg("f1ArgA (any)", "f1 ArgA def"), arg("f1ArgB (any)", _t("f1 ArgB def"))],
      compute: () => {
        return { value: 1 };
      },
    });
    setTranslationMethod((str, ...values) => str);
    addToRegistry(functionRegistry, "FUNC2", {
      description: "func2 def",
      args: [arg("f2ArgA (any)", "f2 ArgA def"), arg("f2ArgB (any, default=TRUE)", "f2 ArgB def")],
      compute: () => {
        return { value: 1 };
      },
    });
    addToRegistry(functionRegistry, "FUNC3", {
      description: "func3 def",
      args: [arg("f3ArgA (any)", "f3 ArgA def"), arg("f3ArgB (any, repeating)", "f3 ArgB def")],
      compute: () => {
        return { value: 1 };
      },
    });
    addToRegistry(functionRegistry, "FUNC3BIS", {
      description: "func3bis def",
      args: [
        arg("f3bisArgA (any)", "f3bis ArgA def"),
        arg("f3bisArgB (any, repeating, optional)", "f3bis ArgB def"),
      ],
      compute: () => {
        return { value: 1 };
      },
    });
    addToRegistry(functionRegistry, "UPTOWNFUNC", {
      description: "a Bruno Mars song ?",
      args: [
        arg("f4ArgA (any)", "f4 ArgA def"),
        arg("f4ArgB (any, repeating)", "f4 ArgB def"),
        arg("f4ArgC (any, repeating)", "f4 ArgC def"),
      ],
      compute: () => {
        return { value: 1 };
      },
    });
    addToRegistry(functionRegistry, "FUNC5", {
      description: "a function with one optional argument defined after two repeating argument",
      args: [
        arg("f5ArgA (any)", "f5 ArgA def"),
        arg("f5ArgB (any, repeating)", "f5 ArgB def"),
        arg("f5ArgC (any, repeating)", "f5 ArgC def"),
        arg("f5ArgD (any, optional)", "f5 ArgD def"),
      ],
      compute: () => {
        return { value: 1 };
      },
    });
    addToRegistry(functionRegistry, "FUNC6", {
      description: "a function with one optional argument defined after three repeating arguments",
      args: [
        arg("f6ArgA (any)", "f6 ArgA def"),
        arg("f6ArgB (any, repeating)", "f6 ArgB def"),
        arg("f6ArgC (any, repeating)", "f6 ArgC def"),
        arg("f6ArgD (any, repeating)", "f6 ArgD def"),
        arg("f6ArgE (any, optional)", "f6 ArgE def"),
      ],
      compute: () => {
        return { value: 1 };
      },
    });
    addToRegistry(functionRegistry, "FUNC7", {
      description: "a function with two optional arguments defined after three repeating arguments",
      args: [
        arg("f7ArgA (any)", "f7 ArgA def"),
        arg("f7ArgB (any, repeating)", "f7 ArgB def"),
        arg("f7ArgC (any, repeating)", "f7 ArgC def"),
        arg("f7ArgD (any, repeating)", "f7 ArgD def"),
        arg("f7ArgE (any, optional)", "f7 ArgE def"),
        arg("f7ArgF (any, optional)", "f7 ArgF def"),
      ],
      compute: () => {
        return { value: 1 };
      },
    });
  });

  describe("appearance", () => {
    test("empty not show autocomplete", async () => {
      await typeInComposer("");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-composer-assistant")).toHaveLength(0);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("= do not show formula assistant", async () => {
      await typeInComposer("=");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-composer-assistant")).toHaveLength(0);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("no search match does not show formula assistant", async () => {
      await typeInComposer("=ZZZZ");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-composer-assistant")).toHaveLength(0);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1( show formula assistant", async () => {
      await typeInComposer("=FUNC1(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
    });

    test("=func1( show formula assistant", async () => {
      await typeInComposer("=func1(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
    });

    test("FUNC1( do not show formula assistant", async () => {
      await typeInComposer("FUNC1");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1 do not show formula assistant", async () => {
      await typeInComposer("=FUNC1");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUN( do not show formula assistant (nothing matches FUN)", async () => {
      await typeInComposer("=FUN(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1) do not show formula assistant", async () => {
      await typeInComposer("=FUNC1)");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1() do not show formula assistant", async () => {
      await typeInComposer("=FUNC1()");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1(( do not show formula assistant", async () => {
      await typeInComposer("=FUNC1((");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1)( do not show formula assistant", async () => {
      await typeInComposer("=FUNC1)(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1(() show formula assistant", async () => {
      await typeInComposer("=FUNC1(()");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
    });

    test("=FUNC1()( do not show formula assistant", async () => {
      await typeInComposer("=FUNC1()(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1(FUNC2( show formula assistant for 2nd function", async () => {
      await typeInComposer("=FUNC1(FUNC2(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
      expect(fixture.querySelectorAll(".o-formula-assistant-head div span")[0].textContent).toBe(
        "FUNC2 ( "
      );
    });

    test("=FUNC1(FUNC2() show formula assistant for 1st function", async () => {
      await typeInComposer("=FUNC1(FUNC2()");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
      expect(fixture.querySelectorAll(".o-formula-assistant-head div span")[0].textContent).toBe(
        "FUNC1 ( "
      );
    });

    test("=FUNC1(FUNC2 do not show formula assistant", async () => {
      await typeInComposer("=FUNC1(FUNC2");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1(A2 show formula assistant (A2 is a ref)", async () => {
      await typeInComposer("=FUNC1(A2");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
    });

    test("=FUNC1('a, do not show formula assistant (A2 is a ref)", async () => {
      await typeInComposer("=FUNC1('a,");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("simple snapshot with =FUNC1(", async () => {
      await typeInComposer("=FUNC1(");
      expect(fixture.querySelector(".o-formula-assistant-container")).toMatchSnapshot();
    });

    test("use arrowKey when selection in a function should not display formula assistant", async () => {
      await typeInComposer("=FUNC1(1,");
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
      await keyDown({ key: "ArrowRight" });
      await keyUp({ key: "ArrowRight" });
      expect(composerStore.currentContent).toBe("=FUNC1(1,B1");
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("use arrowKey during 'editing' mode in a function should display formula assistant", async () => {
      await typeInComposer("=FUNC1(1");
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
      expect(composerStore.editionMode).toBe("editing");
    });

    test("can close and open the formula assistant", async () => {
      await typeInComposer("=FUNC1(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelector(".o-formula-assistant")).toBeDefined();
      expect(fixture.querySelector(".fa-question-circle")).toBe(null);
      await click(fixture, ".fa-times-circle");
      expect(fixture.querySelector(".o-formula-assistant")).toBe(null);
      await click(fixture, ".fa-question-circle");
      expect(fixture.querySelector(".o-formula-assistant")).toBeDefined();
    });

    describe("function definition", () => {
      test("function without argument", async () => {
        await typeInComposer("=FUNC0(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC0 (  )"
        );
      });

      test("normal function", async () => {
        await typeInComposer("=FUNC1(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC1 ( f1ArgA, f1ArgB )"
        );
      });

      test("function with default argument", async () => {
        await typeInComposer("=FUNC2(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC2 ( f2ArgA, [f2ArgB] )"
        );
      });

      test("function with repeatable argument", async () => {
        await typeInComposer("=FUNC3(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC3 ( f3ArgA, f3ArgB1, [f3ArgB2], ...  )"
        );

        await typeInComposer(", ,", false);
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC3 ( f3ArgA, ... , [f3ArgB2], [f3ArgB3], ...  )"
        );
      });

      test("function with repeatable argument optional", async () => {
        await typeInComposer("=FUNC3BIS(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC3BIS ( f3bisArgA, [f3bisArgB1], [f3bisArgB2], ...  )"
        );

        await typeInComposer(", ,", false);
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC3BIS ( f3bisArgA, ... , [f3bisArgB2], [f3bisArgB3], ...  )"
        );
      });

      test("function with multiple repeatable arguments", async () => {
        await typeInComposer("=UPTOWNFUNC(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "UPTOWNFUNC ( f4ArgA, f4ArgB1, f4ArgC1, ...  )"
        );

        await typeInComposer(", , ,", false);
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "UPTOWNFUNC ( f4ArgA, ... , [f4ArgB2, f4ArgC2], ...  )"
        );
      });

      test("arguments separator is localized", async () => {
        updateLocale(parent.env.model, { ...DEFAULT_LOCALE, formulaArgSeparator: ";" });
        await typeInComposer("=FUNC1(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC1 ( f1ArgA; f1ArgB )"
        );
      });
    });

    describe("arguments description", () => {
      test("function without argument", async () => {
        await typeInComposer("=FUNC0(");
        expect(fixture.querySelectorAll(".o-formula-assistant-arg")).toHaveLength(0);
      });

      test("normal argument", async () => {
        await typeInComposer("=FUNC1(");
        expect(fixture.querySelectorAll(".o-formula-assistant-arg")).toHaveLength(2);
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[2].textContent).toBe(
          "f1ArgB"
        );
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[3].textContent).toBe(
          "f1 ArgB def"
        );
      });

      test("argument description is translated", async () => {
        // set the translation method after creating the argument.
        // This is what actually happens because translations are
        // loaded after the function definition
        setTranslationMethod((str, ...values) => {
          if (str === "f1 ArgB def") {
            return "translated description";
          }
          return str;
        });
        await typeInComposer("=FUNC1(");
        registerCleanup(() => setTranslationMethod((str, ...values) => str));
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[3].textContent).toBe(
          "translated description"
        );
      });

      test("function with default argument", async () => {
        await typeInComposer("=FUNC2(");
        expect(fixture.querySelectorAll(".o-formula-assistant-arg")).toHaveLength(2);
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[2].textContent).toBe(
          "f2ArgB - [optional] default: TRUE"
        );
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[3].textContent).toBe(
          "f2 ArgB def"
        );
      });

      test("function with repeatable argument", async () => {
        await typeInComposer("=FUNC3(");
        expect(fixture.querySelectorAll(".o-formula-assistant-arg")).toHaveLength(2);
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[2].textContent).toBe(
          "f3ArgB1"
        );
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[3].textContent).toBe(
          "f3 ArgB def"
        );
      });

      test("function with repeatable argument optional", async () => {
        await typeInComposer("=FUNC3BIS(");
        expect(fixture.querySelectorAll(".o-formula-assistant-arg")).toHaveLength(2);
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[2].textContent).toBe(
          "f3bisArgB1 - [optional] "
        );
      });
    });
  });

  describe("focus argument", () => {
    test("=FUNC1( focus index on 1st arg", async () => {
      await typeInComposer("=FUNC1(");
      expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f1ArgA");
    });

    test("=FUNC1(42 focus index on 1st arg", async () => {
      await typeInComposer("=FUNC1(42");
      expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f1ArgA");
    });

    test("=FUNC1(42 then add ',' focus index on 2nd arg", async () => {
      await typeInComposer("=FUNC1(42");
      await typeInComposer(",", false);
      expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f1ArgB");
    });

    test("=FUNC1(42, focus index on 2nd arg", async () => {
      await typeInComposer("=FUNC1(42,");
      expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f1ArgB");
    });

    test("functions with more arguments than allowed do not have focus", async () => {
      await typeInComposer("=FUNC1(42, 24, 22");
      expect(fixture.querySelectorAll(queryFormulaArgsName)).toHaveLength(0);
    });

    describe("functions with repeatable argument always have a focus", () => {
      test("=FUNC3(84, focus on 2nd argument", async () => {
        await typeInComposer("=FUNC3(84,");
        expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f3ArgB1");
      });

      test("=FUNC3(84, 42, focus on 2nd argument", async () => {
        await typeInComposer("=FUNC3(84, 42,");
        expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f3ArgB2");
      });
    });

    describe("functions with more than one repeatable argument have an alternate focus", () => {
      test("=UPTOWNFUNC(1, 2, focus on 3th argument", async () => {
        await typeInComposer("=UPTOWNFUNC(1, 2,");
        expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f4ArgC1");
      });

      test("=UPTOWNFUNC(1, 2, 3, focus on 2nd argument", async () => {
        await typeInComposer("=UPTOWNFUNC(1, 2, 3,");
        expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f4ArgB2");
      });

      test("=UPTOWNFUNC(1, 2, 3, 4,  focus on 3th argument", async () => {
        await typeInComposer("=UPTOWNFUNC(1, 2, 3, 4,");
        expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f4ArgC2");
      });

      test("=UPTOWNFUNC(1, 2, 3, 4, 5, focus on 4th argument", async () => {
        await typeInComposer("=UPTOWNFUNC(1, 2, 3, 4, 5,");
        expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f4ArgB3");
      });

      test("Formula Helper updates when navigating with keyboard arrows", async () => {
        await typeInComposer("=UPTOWNFUNC(1, 2, 3");
        expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f4ArgC1");
        expect(getInputSelection()).toEqual({
          anchorNodeText: "3",
          anchorOffset: 1,
          focusNodeText: "3",
          focusOffset: 1,
        });
        await moveCursorToLeftInSelection(3, "2");
        expect(getInputSelection()).toEqual({
          anchorNodeText: "2",
          anchorOffset: 1,
          focusNodeText: "2",
          focusOffset: 1,
        });
        expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f4ArgB1");
      });
    });

    describe("functions with optional argument defined after a repeating argument", () => {
      test("=FUNC5(1, 2, focus on 3th argument", async () => {
        await typeInComposer("=FUNC5(1, 2,");
        expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f5ArgC1");
      });

      test("=FUNC5(1, 2, 3,  focus on 2nd and 4th arguments", async () => {
        await typeInComposer("=FUNC5(1, 2, 3,");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(2);
        expect(focusArgs[0].textContent).toBe("f5ArgB2");
        expect(focusArgs[1].textContent).toBe("f5ArgD");
      });

      test("=FUNC5(1, 2, 3, 4,  focus on 3th argument", async () => {
        await typeInComposer("=FUNC5(1, 2, 3, 4,");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f5ArgC2");
      });

      test("=FUNC5(1, 2, 3, 4, 5 and comme back on the 4th argument --> focus on the 2nd argument only", async () => {
        await typeInComposer("=FUNC5(1, 2, 3, 4, 5");
        await moveCursorToLeftInSelection(3, "4");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f5ArgB2");
      });
    });

    describe("functions with one optional argument defined after two repeating arguments", () => {
      test("=FUNC5(1, 2, focus on 3th argument", async () => {
        await typeInComposer("=FUNC5(1, 2,");
        expect(fixture.querySelectorAll(queryFormulaArgsName)[0].textContent).toBe("f5ArgC1");
      });

      test("=FUNC5(1, 2, 3,  focus on 2nd and 4th arguments", async () => {
        await typeInComposer("=FUNC5(1, 2, 3,");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(2);
        expect(focusArgs[0].textContent).toBe("f5ArgB2");
        expect(focusArgs[1].textContent).toBe("f5ArgD");
      });

      test("=FUNC5(1, 2, 3, 4,  focus on 3th argument", async () => {
        await typeInComposer("=FUNC5(1, 2, 3, 4,");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f5ArgC2");
      });

      test("=FUNC5(1, 2, 3, 4, 5 and comme back on the 4th argument --> focus on the 2nd argument only", async () => {
        await typeInComposer("=FUNC5(1, 2, 3, 4, 5");
        await moveCursorToLeftInSelection(3, "4");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f5ArgB2");
      });
    });

    describe("functions with one optional argument defined after three repeating arguments", () => {
      test("=FUNC6(1, 2, 3, 4, focus on 2nd and 5th argument", async () => {
        await typeInComposer("=FUNC6(1, 2, 3, 4,");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(2);
        expect(focusArgs[0].textContent).toBe("f6ArgB2");
        expect(focusArgs[1].textContent).toBe("f6ArgE");
      });

      test("=FUNC6(1, 2, 3, 4, 5, focus on 3th arguments", async () => {
        await typeInComposer("=FUNC6(1, 2, 3, 4, 5,");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f6ArgC2");
      });

      test("=FUNC6(1, 2, 3, 4, 5, 6, focus on 4th arguments", async () => {
        await typeInComposer("=FUNC6(1, 2, 3, 4, 5, 6,");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f6ArgD2");
      });

      test("=FUNC6(1, 2, 3, 4, 5, 6, and comme back on previous argument --> focus only one argument", async () => {
        await typeInComposer("=FUNC6(1, 2, 3, 4, 5, 6, 7");

        await moveCursorToLeftInSelection(3, "6");
        let focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f6ArgC2");

        await moveCursorToLeftInSelection(6, "5");
        focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f6ArgB2");
      });
    });

    describe("functions with two optional arguments defined after three repeating arguments", () => {
      test("=FUNC7(1, 2, 3, 4, focus on 2nd and 5th argument", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4,");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(2);
        expect(focusArgs[0].textContent).toBe("f7ArgB2");
        expect(focusArgs[1].textContent).toBe("f7ArgE");
      });

      test("=FUNC7(1, 2, 3, 4, 5, focus on 3th and 6th arguments", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4, 5,");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(2);
        expect(focusArgs[0].textContent).toBe("f7ArgC2");
        expect(focusArgs[1].textContent).toBe("f7ArgF");
      });

      test("=FUNC7(1, 2, 3, 4, 5, 6, focus on 4th arguments", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4, 5, 6,");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f7ArgD2");
      });

      test("=FUNC7(1, 2, 3, 4, 5, 6, 7 and comme back on previous argument  --> focus only one argument", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4, 5, 6, 7");

        await moveCursorToLeftInSelection(3, "6");
        let focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f7ArgC2");

        await moveCursorToLeftInSelection(6, "5");
        focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f7ArgB2");
      });
    });

    describe("function with right parenthesis --> freeze args count and focus maximum one arg", () => {
      test("type =FUNC6(1, 2, 3, 4, ) and move one the 5th position --> focus the 5th argument only", async () => {
        await typeInComposer("=FUNC6(1, 2, 3, 4, )");
        await moveCursorToLeftInSelection(1, " ");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f6ArgE");
      });

      test("type =FUNC7(1, 2, 3, 4, ) and move on the 5th position --> focus the 5th argument only", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4, )");
        await keyDown({ key: "ArrowLeft" });
        await moveCursorToLeftInSelection(1, " ");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f7ArgE");
      });

      test("type =FUNC7(1, 2, 3, 4, 5, ) and move on the 6th position --> focus the 6th argument only", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4, 5, )");
        await moveCursorToLeftInSelection(1, " ");
        const focusArgs = fixture.querySelectorAll(queryFormulaArgName);
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f7ArgF");
      });
    });
  });
});

describe("formula assistant for boolean functions", () => {
  beforeEach(() => {
    clearFunctions();
    addToRegistry(functionRegistry, "TRUE", {
      description: "TRUE",
      args: [],
      compute: () => {
        return { value: true };
      },
    });
    addToRegistry(functionRegistry, "FALSE", {
      description: "FALSE",
      args: [],
      compute: () => {
        return { value: false };
      },
    });
  });

  test.each(["=TRUE(", "=true(", "=FALSE(", "=false("])(
    "show boolean formula assistant",
    async () => {
      await typeInComposer("=TRue(");
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
    }
  );
});
