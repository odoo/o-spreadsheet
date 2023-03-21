import { args, functionRegistry } from "../../src/functions/index";
import { Model } from "../../src/model";
import {
  clearFunctions,
  mountSpreadsheet,
  nextTick,
  restoreDefaultFunctions,
  typeInComposerGrid,
} from "../test_helpers/helpers";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let model: Model;
let composerEl: Element;
let fixture: HTMLElement;

beforeEach(async () => {
  ({ model, fixture } = await mountSpreadsheet());

  // start composition
  document.querySelector(".o-grid")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  await nextTick();
  composerEl = fixture.querySelector(".o-grid div.o-composer")!;
});

describe("formula assistant", () => {
  beforeAll(() => {
    clearFunctions();
    functionRegistry.add("FUNC0", {
      description: "func without args",
      args: args(``),
      compute: () => 1,
      returns: ["ANY"],
    });
    functionRegistry.add("FUNC1", {
      description: "func1 def",
      args: args(`
              f1Arg1 (any) f1 Arg1 def
              f1Arg2 (any) f1 Arg2 def
          `),
      compute: () => 1,
      returns: ["ANY"],
    });
    functionRegistry.add("FUNC2", {
      description: "func2 def",
      args: args(`
              f2Arg1 (any) f2 Arg1 def
              f2Arg2 (any, optional, default=TRUE) f2 Arg2 def
          `),
      compute: () => 1,
      returns: ["ANY"],
    });
    functionRegistry.add("FUNC3", {
      description: "func3 def",
      args: args(`
                f3Arg1 (any) f3 Arg1 def
                f3Arg2 (any, optional, repeating) f3 Arg2 def
            `),
      compute: () => 1,
      returns: ["ANY"],
    });
    functionRegistry.add("UPTOWNFUNC", {
      description: "a Bruno Mars song ?",
      args: args(`
              f4Arg1 (any) f4 Arg1 def
              f4Arg2 (any, optional, repeating) f4 Arg2 def
              f4Arg3 (any, optional, repeating) f4 Arg3 def
          `),
      compute: () => 1,
      returns: ["ANY"],
    });
  });

  afterAll(() => {
    restoreDefaultFunctions();
  });

  describe("appearance", () => {
    test("empty not show autocomplete", async () => {
      await typeInComposerGrid("");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("= do not show formula assistant", async () => {
      await typeInComposerGrid("=");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1( show formula assistant", async () => {
      await typeInComposerGrid("=FUNC1(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
    });

    test("=func1( show formula assistant", async () => {
      await typeInComposerGrid("=func1(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
    });

    test("FUNC1( do not show formula assistant", async () => {
      await typeInComposerGrid("FUNC1");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1 do not show formula assistant", async () => {
      await typeInComposerGrid("=FUNC1");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUN( do not show formula assistant (nothing matches FUN)", async () => {
      await typeInComposerGrid("=FUN(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1) do not show formula assistant", async () => {
      await typeInComposerGrid("=FUNC1)");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1() do not show formula assistant", async () => {
      await typeInComposerGrid("=FUNC1()");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1(( do not show formula assistant", async () => {
      await typeInComposerGrid("=FUNC1((");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1)( do not show formula assistant", async () => {
      await typeInComposerGrid("=FUNC1)(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1(() show formula assistant", async () => {
      await typeInComposerGrid("=FUNC1(()");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
    });

    test("=FUNC1()( do not show formula assistant", async () => {
      await typeInComposerGrid("=FUNC1()(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1(FUNC2( show formula assistant for 2nd function", async () => {
      await typeInComposerGrid("=FUNC1(FUNC2(");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
      expect(fixture.querySelectorAll(".o-formula-assistant-head span")[0].textContent).toBe(
        "FUNC2"
      );
    });

    test("=FUNC1(FUNC2() show formula assistant for 1st function", async () => {
      await typeInComposerGrid("=FUNC1(FUNC2()");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
      expect(fixture.querySelectorAll(".o-formula-assistant-head span")[0].textContent).toBe(
        "FUNC1"
      );
    });

    test("=FUNC1(FUNC2 do not show formula assistant", async () => {
      await typeInComposerGrid("=FUNC1(FUNC2");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("=FUNC1(A2 show formula assistant (A2 is a ref)", async () => {
      await typeInComposerGrid("=FUNC1(A2");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
    });

    test("=FUNC1('a, do not show formula assistant (A2 is a ref)", async () => {
      await typeInComposerGrid("=FUNC1('a,");
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("simple snapshot with =FUNC1(", async () => {
      await typeInComposerGrid("=FUNC1(");
      expect(fixture.querySelector(".o-formula-assistant-container")).toMatchSnapshot();
    });

    test("use arrowKey when selection in a function should not display formula assistant", async () => {
      await typeInComposerGrid("=FUNC1(1,");
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
      composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await nextTick();
      composerEl.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }));
      await nextTick();
      expect(model.getters.getCurrentContent()).toBe("=FUNC1(1,B1");
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(0);
    });

    test("use arrowKey during 'editing' mode in a function should display formula assistant", async () => {
      await typeInComposerGrid("=FUNC1(1");
      expect(fixture.querySelectorAll(".o-formula-assistant")).toHaveLength(1);
      expect(model.getters.getEditionMode()).toBe("editing");
    });

    describe("function definition", () => {
      test("function without argument", async () => {
        await typeInComposerGrid("=FUNC0(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC0 (  ) "
        );
      });

      test("normal function", async () => {
        await typeInComposerGrid("=FUNC1(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC1 ( f1Arg1, f1Arg2 ) "
        );
      });

      test("function with default argument", async () => {
        await typeInComposerGrid("=FUNC2(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC2 ( f2Arg1, [f2Arg2] ) "
        );
      });

      test("function with repeatable argument", async () => {
        await typeInComposerGrid("=FUNC3(");
        expect(fixture.querySelectorAll(".o-formula-assistant-head")[0].textContent).toBe(
          "FUNC3 ( f3Arg1, [f3Arg2, ...] ) "
        );
      });
    });

    describe("arguments description", () => {
      test("function without argument", async () => {
        await typeInComposerGrid("=FUNC0(");
        expect(fixture.querySelectorAll(".o-formula-assistant-arg")).toHaveLength(0);
      });

      test("normal argument", async () => {
        await typeInComposerGrid("=FUNC1(");
        expect(fixture.querySelectorAll(".o-formula-assistant-arg")).toHaveLength(2);
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[2].textContent).toBe(
          "f1Arg2"
        );
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[3].textContent).toBe(
          "f1 Arg2 def"
        );
      });

      test("function with default argument", async () => {
        await typeInComposerGrid("=FUNC2(");
        expect(fixture.querySelectorAll(".o-formula-assistant-arg")).toHaveLength(2);
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[2].textContent).toBe(
          "f2Arg2 - [optional] TRUE by default"
        );
        expect(fixture.querySelectorAll(".o-formula-assistant-arg div")[3].textContent).toBe(
          "f2 Arg2 def"
        );
      });

      test("function with repeatable argument", async () => {
        await typeInComposerGrid("=FUNC3(");
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
      await typeInComposerGrid("=FUNC1(");
      expect(
        fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
          .textContent
      ).toBe("f1Arg1");
    });

    test("=FUNC1(42 focus index on 1st arg", async () => {
      await typeInComposerGrid("=FUNC1(42");
      expect(
        fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
          .textContent
      ).toBe("f1Arg1");
    });

    test("=FUNC1(42 then add ',' focus index on 2nd arg", async () => {
      await typeInComposerGrid("=FUNC1(42");
      await typeInComposerGrid(",");
      expect(
        fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
          .textContent
      ).toBe("f1Arg2");
    });

    test("=FUNC1(42, focus index on 2nd arg", async () => {
      await typeInComposerGrid("=FUNC1(42,");
      expect(
        fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
          .textContent
      ).toBe("f1Arg2");
    });

    test("functions with more arguments than allowed do not have focus", async () => {
      await typeInComposerGrid("=FUNC1(42, 24, 22");
      expect(
        fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")
      ).toHaveLength(0);
    });

    describe("functions with repeatable argument always have a focus", () => {
      test("=FUNC3(84, focus on 2nd argument", async () => {
        await typeInComposerGrid("=FUNC3(84,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f3Arg2");
      });

      test("=FUNC3(84, 42, focus on 2nd argument", async () => {
        await typeInComposerGrid("=FUNC3(84, 42,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f3Arg2");
      });
    });

    describe("functions with more than one repeatable argument have an alternate focus", () => {
      test("=UPTOWNFUNC(1, 2, focus on 3th argument", async () => {
        await typeInComposerGrid("=UPTOWNFUNC(1, 2,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f4Arg3");
      });

      test("=UPTOWNFUNC(1, 2, 3, focus on 2nd argument", async () => {
        await typeInComposerGrid("=UPTOWNFUNC(1, 2, 3,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f4Arg2");
      });

      test("=UPTOWNFUNC(1, 2, 3, 4,  focus on 3th argument", async () => {
        await typeInComposerGrid("=UPTOWNFUNC(1, 2, 3, 4,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f4Arg3");
      });

      test("=UPTOWNFUNC(1, 2, 3, 4, 5, focus on 4th argument", async () => {
        await typeInComposerGrid("=UPTOWNFUNC(1, 2, 3, 4, 5,");
        expect(
          fixture.querySelectorAll(".o-formula-assistant-arg.o-formula-assistant-focus span")[0]
            .textContent
        ).toBe("f4Arg2");
      });
    });
  });
});
