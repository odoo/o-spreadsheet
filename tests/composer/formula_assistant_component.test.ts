import { functionRegistry } from "@odoo/o-spreadsheet-engine";
import { setTranslationMethod } from "../../src";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { arg } from "../../src/functions/index";
import { Store } from "../../src/store_engine";
import { _t } from "../../src/translation";
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
      compute: () => 1,
    });
    setTranslationMethod(
      (str, ...values) => str,
      () => false
    );
    addToRegistry(functionRegistry, "FUNC1", {
      description: "func1 def",
      args: [arg("f1Arg1 (any)", "f1 Arg1 def"), arg("f1Arg2 (any)", _t("f1 Arg2 def"))],
      compute: () => 1,
    });
    setTranslationMethod((str, ...values) => str);
    addToRegistry(functionRegistry, "FUNC2", {
      description: "func2 def",
      args: [arg("f2Arg1 (any)", "f2 Arg1 def"), arg("f2Arg2 (any, default=TRUE)", "f2 Arg2 def")],
      compute: () => 1,
    });
    addToRegistry(functionRegistry, "FUNC3", {
      description: "func3 def",
      args: [arg("f3Arg1 (any)", "f3 Arg1 def"), arg("f3Arg2 (any, repeating)", "f3 Arg2 def")],
      compute: () => 1,
    });
    addToRegistry(functionRegistry, "UPTOWNFUNC", {
      description: "a Bruno Mars song ?",
      args: [
        arg("f4Arg1 (any)", "f4 Arg1 def"),
        arg("f4Arg2 (any, repeating)", "f4 Arg2 def"),
        arg("f4Arg3 (any, repeating)", "f4 Arg3 def"),
      ],
      compute: () => 1,
    });
    addToRegistry(functionRegistry, "FUNC5", {
      description: "a function with one optional argument defined after two repeating argument",
      args: [
        arg("f5Arg1 (any)", "f5 Arg1 def"),
        arg("f5Arg2 (any, repeating)", "f5 Arg2 def"),
        arg("f5Arg3 (any, repeating)", "f5 Arg3 def"),
        arg("f5Arg4 (any, optional)", "f5 Arg4 def"),
      ],
      compute: () => 1,
    });
    addToRegistry(functionRegistry, "FUNC6", {
      description: "a function with one optional argument defined after three repeating arguments",
      args: [
        arg("f6Arg1 (any)", "f6 Arg1 def"),
        arg("f6Arg2 (any, repeating)", "f6 Arg2 def"),
        arg("f6Arg3 (any, repeating)", "f6 Arg3 def"),
        arg("f6Arg4 (any, repeating)", "f6 Arg4 def"),
        arg("f6Arg5 (any, optional)", "f6 Arg5 def"),
      ],
      compute: () => 1,
    });
    addToRegistry(functionRegistry, "FUNC7", {
      description: "a function with two optional arguments defined after three repeating arguments",
      args: [
        arg("f7Arg1 (any)", "f7 Arg1 def"),
        arg("f7Arg2 (any, repeating)", "f7 Arg2 def"),
        arg("f7Arg3 (any, repeating)", "f7 Arg3 def"),
        arg("f7Arg4 (any, repeating)", "f7 Arg4 def"),
        arg("f7Arg5 (any, optional)", "f7 Arg5 def"),
        arg("f7Arg6 (any, optional)", "f7 Arg6 def"),
      ],
      compute: () => 1,
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
      expect(fixture.querySelectorAll(".o-formula-assistant-head span")[0].textContent).toBe(
        "FUNC2"
      );
    });

    test("=FUNC1(FUNC2() show formula assistant for 1st function", async () => {
      await typeInComposer("=FUNC1(FUNC2()");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
      expect(fixture.querySelectorAll(".o-formula-assistant-head span")[0].textContent).toBe(
        "FUNC1"
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
          "FUNC0 (  ) "
        );
      });

      test("normal function", async () => {
        await typeInComposer("=FUNC1(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC1 ( f1Arg1, f1Arg2 ) "
        );
      });

      test("function with default argument", async () => {
        await typeInComposer("=FUNC2(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC2 ( f2Arg1, [f2Arg2] ) "
        );
      });

      test("function with repeatable argument", async () => {
        await typeInComposer("=FUNC3(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC3 ( f3Arg1, [f3Arg2, ...] ) "
        );
      });

      test("arguments separator is localized", async () => {
        updateLocale(parent.env.model, { ...DEFAULT_LOCALE, formulaArgSeparator: ";" });
        await typeInComposer("=FUNC1(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC1 ( f1Arg1; f1Arg2 ) "
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
          "f1Arg2"
        );
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[3].textContent).toBe(
          "f1 Arg2 def"
        );
      });

      test("argument description is translated", async () => {
        // set the translation method after creating the argument.
        // This is what actually happens because translations are
        // loaded after the function definition
        setTranslationMethod((str, ...values) => {
          if (str === "f1 Arg2 def") {
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
          "f2Arg2 - [optional] default: TRUE"
        );
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[3].textContent).toBe(
          "f2 Arg2 def"
        );
      });

      test("function with repeatable argument", async () => {
        await typeInComposer("=FUNC3(");
        expect(fixture.querySelectorAll(".o-formula-assistant-arg")).toHaveLength(2);
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[2].textContent).toBe(
          "f3Arg2 - [optional] repeatable"
        );
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[3].textContent).toBe(
          "f3 Arg2 def"
        );
      });
    });
  });

  describe("focus argument", () => {
    test("=FUNC1( focus index on 1st arg", async () => {
      await typeInComposer("=FUNC1(");
      expect(
        fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
          .textContent
      ).toBe("f1Arg1");
    });

    test("=FUNC1(42 focus index on 1st arg", async () => {
      await typeInComposer("=FUNC1(42");
      expect(
        fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
          .textContent
      ).toBe("f1Arg1");
    });

    test("=FUNC1(42 then add ',' focus index on 2nd arg", async () => {
      await typeInComposer("=FUNC1(42");
      await typeInComposer(",", false);
      expect(
        fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
          .textContent
      ).toBe("f1Arg2");
    });

    test("=FUNC1(42, focus index on 2nd arg", async () => {
      await typeInComposer("=FUNC1(42,");
      expect(
        fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
          .textContent
      ).toBe("f1Arg2");
    });

    test("functions with more arguments than allowed do not have focus", async () => {
      await typeInComposer("=FUNC1(42, 24, 22");
      expect(
        fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")
      ).toHaveLength(0);
    });

    describe("functions with repeatable argument always have a focus", () => {
      test("=FUNC3(84, focus on 2nd argument", async () => {
        await typeInComposer("=FUNC3(84,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f3Arg2");
      });

      test("=FUNC3(84, 42, focus on 2nd argument", async () => {
        await typeInComposer("=FUNC3(84, 42,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f3Arg2");
      });
    });

    describe("functions with more than one repeatable argument have an alternate focus", () => {
      test("=UPTOWNFUNC(1, 2, focus on 3th argument", async () => {
        await typeInComposer("=UPTOWNFUNC(1, 2,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f4Arg3");
      });

      test("=UPTOWNFUNC(1, 2, 3, focus on 2nd argument", async () => {
        await typeInComposer("=UPTOWNFUNC(1, 2, 3,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f4Arg2");
      });

      test("=UPTOWNFUNC(1, 2, 3, 4,  focus on 3th argument", async () => {
        await typeInComposer("=UPTOWNFUNC(1, 2, 3, 4,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f4Arg3");
      });

      test("=UPTOWNFUNC(1, 2, 3, 4, 5, focus on 4th argument", async () => {
        await typeInComposer("=UPTOWNFUNC(1, 2, 3, 4, 5,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f4Arg2");
      });

      test("Formula Helper updates when navigating with keyboard arrows", async () => {
        await typeInComposer("=UPTOWNFUNC(1, 2, 3");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f4Arg3");
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
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f4Arg2");
      });
    });

    describe("functions with optional argument defined after a repeating argument", () => {
      test("=FUNC5(1, 2, focus on 3th argument", async () => {
        await typeInComposer("=FUNC5(1, 2,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f5Arg3");
      });

      test("=FUNC5(1, 2, 3,  focus on 2nd and 4th arguments", async () => {
        await typeInComposer("=FUNC5(1, 2, 3,");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(2);
        expect(focusArgs[0].textContent).toBe("f5Arg2");
        expect(focusArgs[1].textContent).toBe("f5Arg4");
      });

      test("=FUNC5(1, 2, 3, 4,  focus on 3th argument", async () => {
        await typeInComposer("=FUNC5(1, 2, 3, 4,");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f5Arg3");
      });

      test("=FUNC5(1, 2, 3, 4, 5 and comme back on the 4th argument --> focus on the 2nd argument only", async () => {
        await typeInComposer("=FUNC5(1, 2, 3, 4, 5");
        await moveCursorToLeftInSelection(3, "4");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f5Arg2");
      });
    });

    describe("functions with one optional argument defined after two repeating arguments", () => {
      test("=FUNC5(1, 2, focus on 3th argument", async () => {
        await typeInComposer("=FUNC5(1, 2,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f5Arg3");
      });

      test("=FUNC5(1, 2, 3,  focus on 2nd and 4th arguments", async () => {
        await typeInComposer("=FUNC5(1, 2, 3,");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(2);
        expect(focusArgs[0].textContent).toBe("f5Arg2");
        expect(focusArgs[1].textContent).toBe("f5Arg4");
      });

      test("=FUNC5(1, 2, 3, 4,  focus on 3th argument", async () => {
        await typeInComposer("=FUNC5(1, 2, 3, 4,");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f5Arg3");
      });

      test("=FUNC5(1, 2, 3, 4, 5 and comme back on the 4th argument --> focus on the 2nd argument only", async () => {
        await typeInComposer("=FUNC5(1, 2, 3, 4, 5");
        await moveCursorToLeftInSelection(3, "4");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f5Arg2");
      });
    });

    describe("functions with one optional argument defined after three repeating arguments", () => {
      test("=FUNC6(1, 2, 3, 4, focus on 2nd and 5th argument", async () => {
        await typeInComposer("=FUNC6(1, 2, 3, 4,");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(2);
        expect(focusArgs[0].textContent).toBe("f6Arg2");
        expect(focusArgs[1].textContent).toBe("f6Arg5");
      });

      test("=FUNC6(1, 2, 3, 4, 5, focus on 3th arguments", async () => {
        await typeInComposer("=FUNC6(1, 2, 3, 4, 5,");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f6Arg3");
      });

      test("=FUNC6(1, 2, 3, 4, 5, 6, focus on 4th arguments", async () => {
        await typeInComposer("=FUNC6(1, 2, 3, 4, 5, 6,");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f6Arg4");
      });

      test("=FUNC6(1, 2, 3, 4, 5, 6, and comme back on previous argument --> focus only one argument", async () => {
        await typeInComposer("=FUNC6(1, 2, 3, 4, 5, 6, 7");

        await moveCursorToLeftInSelection(3, "6");
        let focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f6Arg3");

        await moveCursorToLeftInSelection(6, "5");
        focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f6Arg2");
      });
    });

    describe("functions with two optional arguments defined after three repeating arguments", () => {
      test("=FUNC7(1, 2, 3, 4, focus on 2nd and 5th argument", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4,");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(2);
        expect(focusArgs[0].textContent).toBe("f7Arg2");
        expect(focusArgs[1].textContent).toBe("f7Arg5");
      });

      test("=FUNC7(1, 2, 3, 4, 5, focus on 3th and 6th arguments", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4, 5,");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(2);
        expect(focusArgs[0].textContent).toBe("f7Arg3");
        expect(focusArgs[1].textContent).toBe("f7Arg6");
      });

      test("=FUNC7(1, 2, 3, 4, 5, 6, focus on 4th arguments", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4, 5, 6,");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f7Arg4");
      });

      test("=FUNC7(1, 2, 3, 4, 5, 6, 7 and comme back on previous argument  --> focus only one argument", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4, 5, 6, 7");

        await moveCursorToLeftInSelection(3, "6");
        let focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f7Arg3");

        await moveCursorToLeftInSelection(6, "5");
        focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f7Arg2");
      });
    });

    describe("function with right parenthesis --> freeze args count and focus maximum one arg", () => {
      test("type =FUNC6(1, 2, 3, 4, ) and move one the 5th position --> focus the 5th argument only", async () => {
        await typeInComposer("=FUNC6(1, 2, 3, 4, )");
        await moveCursorToLeftInSelection(1, " ");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f6Arg5");
      });

      test("type =FUNC7(1, 2, 3, 4, ) and move on the 5th position --> focus the 5th argument only", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4, )");
        await keyDown({ key: "ArrowLeft" });
        await moveCursorToLeftInSelection(1, " ");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f7Arg5");
      });

      test("type =FUNC7(1, 2, 3, 4, 5, ) and move on the 6th position --> focus the 6th argument only", async () => {
        await typeInComposer("=FUNC7(1, 2, 3, 4, 5, )");
        await moveCursorToLeftInSelection(1, " ");
        const focusArgs = fixture.querySelectorAll(
          ".o-formula-assistant-arg.o-formula-assistant-focus div span:first-child"
        );
        expect(focusArgs.length).toBe(1);
        expect(focusArgs[0].textContent).toBe("f7Arg6");
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
      compute: () => true,
    });
    addToRegistry(functionRegistry, "FALSE", {
      description: "FALSE",
      args: [],
      compute: () => false,
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
