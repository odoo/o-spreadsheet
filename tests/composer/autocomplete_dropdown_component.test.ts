import { registries } from "../../src";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { functionRegistry } from "../../src/functions/index";
import { Model } from "../../src/model";
import { Store } from "../../src/store_engine";
import { ContentEditableHelper } from "../__mocks__/content_editable_helper";
import { registerCleanup } from "../setup/jest.setup";
import { selectCell } from "../test_helpers/commands_helpers";
import {
  click,
  keyDown,
  keyUp,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { getCellText } from "../test_helpers/getters_helpers";
import {
  ComposerWrapper,
  clearFunctions,
  mountComposerWrapper,
  nextTick,
  restoreDefaultFunctions,
  typeInComposerHelper,
} from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";
jest.mock("../../src/components/composer/content_editable_helper.ts", () =>
  require("../__mocks__/content_editable_helper")
);

let model: Model;
let composerEl: Element;
let fixture: HTMLElement;
let cehMock: ContentEditableHelper;
let parent: ComposerWrapper;
let composerStore: Store<CellComposerStore>;

async function typeInComposer(text: string, fromScratch: boolean = true) {
  if (fromScratch) {
    parent.startComposition();
  }
  const composerEl = await typeInComposerHelper("div.o-composer", text, false);
  cehMock = window.mockContentHelper;
  return composerEl;
}

beforeEach(() => {
  clearFunctions();
  functionRegistry
    .add("IF", {
      description: "do if",
      args: [],
      compute: () => 1,
    })
    .add("SUM", {
      description: "do sum",
      args: [],
      compute: () => 1,
    })
    .add("SZZ", {
      description: "do something",
      args: [],
      compute: () => 1,
    })
    .add("HIDDEN", {
      description: "do something",
      args: [],
      compute: () => 1,
      hidden: true,
    });
});

afterEach(() => {
  restoreDefaultFunctions();
});

describe("Functions autocomplete", () => {
  beforeEach(async () => {
    ({ model, fixture, parent } = await mountComposerWrapper());
    // start composition
    parent.startComposition();
    await nextTick();
    composerEl = fixture.querySelector("div.o-composer")!;
    composerStore = parent.env.getStore(CellComposerStore);
  });

  describe("autocomplete", () => {
    test("= do not show autocomplete", async () => {
      await typeInComposer("=");
      const activeElement = document.activeElement;
      expect(activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test("=HI do not show autocomplete when entering hidden function names", async () => {
      await typeInComposer("=HI");
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

    test("=S+TAB complete the function --> =SUM(␣", async () => {
      await typeInComposer("=S");
      await keyDown({ key: "Tab" });
      expect(composerEl.textContent).toBe("=SUM(");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(5);
    });

    test("=S+ENTER complete the function --> =SUM(␣", async () => {
      await typeInComposer("=S");
      await keyDown({ key: "Enter" });
      expect(composerEl.textContent).toBe("=SUM(");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(5);
    });

    test("=SX not show autocomplete (nothing matches SX)", async () => {
      await typeInComposer("=SX");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test("=SX+TAB does not autocomplete anything and moves to the cell down", async () => {
      await typeInComposer("=SX");
      await keyDown({ key: "Tab" });
      expect(getCellText(model, "A1")).toBe("=SX");
    });

    test("=S+UP cycle to the last item", async () => {
      await typeInComposer("=S");
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
      await keyDown({ key: "ArrowUp" });
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SZZ");
    });

    test("=+DOWN+UP move to next/previous autocomplete", async () => {
      await typeInComposer("=S");
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
      await keyDown({ key: "ArrowDown" });
      await keyUp({ key: "ArrowDown" });
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SZZ");
      await keyDown({ key: "ArrowUp" });
      await keyUp({ key: "ArrowUp" });
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
    });

    test("=+DOWN+DOWN cycle to the first item", async () => {
      await typeInComposer("=S");
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
      await keyDown({ key: "ArrowDown" });
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SZZ");
      await keyDown({ key: "ArrowDown" });
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
    });

    test("autocomplete restrict number of proposition to 10", async () => {
      for (let i = 0; i < 20; i++) {
        functionRegistry.add(`SUM${i + 1}`, {
          description: "do sum",
          args: [],
          compute: () => 1,
        });
      }

      await typeInComposer("=S");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(10);
    });

    test("click on a autocomplete does the autocomplete", async () => {
      await typeInComposer("=S");
      await click(fixture, ".o-autocomplete-dropdown > div:nth-child(2)");
      expect(composerEl.textContent).toBe("=SZZ(");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(5);
      expect(document.activeElement).toBe(composerEl);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test("autocomplete fuzzy search", async () => {
      for (const f of ["TEST_FUZZY", "FUZZY_TEST", "TEST_FUZZY_TEST"]) {
        functionRegistry.add(f, {
          description: "",
          args: [],
          compute: () => 1,
        });
      }
      await typeInComposer("=FUZZY");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(3);
      expect(fixture.querySelectorAll(".o-autocomplete-value")[0].textContent).toBe("FUZZY_TEST");
      expect(fixture.querySelectorAll(".o-autocomplete-value")[1].textContent).toBe("TEST_FUZZY");
      expect(fixture.querySelectorAll(".o-autocomplete-value")[2].textContent).toBe(
        "TEST_FUZZY_TEST"
      );
    });

    test("autocomplete not displayed for exact match", async () => {
      functionRegistry.add("FUZZY", {
        description: "",
        args: [],
        compute: () => 1,
      });
      await typeInComposer("=FUZZY");
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(0);
    });

    test("Mouse events on the autocomplete dropdown don't make the composer loose focus", async () => {
      await typeInComposer("=S");
      const activeElement = document.activeElement;
      expect(activeElement?.classList).toContain("o-composer");

      const dropDownEl = fixture.querySelector(".o-autocomplete-dropdown")!;
      expect(document.activeElement).toEqual(activeElement);

      await simulateClick(dropDownEl);
      expect(document.activeElement).toEqual(activeElement);
    });

    test("Hovering over an autocomplete entry highlights it as the current choice", async () => {
      await typeInComposer("=S");
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
      const entries = fixture.querySelectorAll(".o-autocomplete-value");
      const firstEntry = entries[0];
      const secondEntry = entries[1];
      triggerMouseEvent(secondEntry, "pointermove");
      await nextTick();
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SZZ");
      triggerMouseEvent(firstEntry, "pointermove");
      await nextTick();
      expect(
        fixture.querySelector(".o-autocomplete-value-focus .o-autocomplete-value")!.textContent
      ).toBe("SUM");
    });

    test("key down or up selects auto-complete proposals instead of reference", async () => {
      registries.autoCompleteProviders.add("test", {
        getProposals() {
          return [{ text: "option 1" }, { text: "option 2" }];
        },
        selectProposal() {},
      });
      registerCleanup(() => registries.autoCompleteProviders.remove("test"));
      await typeInComposer("=SUM(");
      const proposals = [...fixture.querySelectorAll(".o-autocomplete-value")].map(
        (el) => el.parentElement
      );

      expect(composerStore.autocompleteProvider?.proposals).toHaveLength(2);
      expect(composerStore.showSelectionIndicator).toBe(true);
      expect(proposals[0]?.classList).not.toContain("o-autocomplete-value-focus");
      expect(proposals[1]?.classList).not.toContain("o-autocomplete-value-focus");

      await keyDown({ key: "ArrowDown" });
      expect(proposals[0]?.classList).toContain("o-autocomplete-value-focus");
      expect(proposals[1]?.classList).not.toContain("o-autocomplete-value-focus");
      expect(composerStore.currentContent).toBe("=SUM(");

      await keyDown({ key: "ArrowUp" });
      expect(proposals[0]?.classList).not.toContain("o-autocomplete-value-focus");
      expect(proposals[1]?.classList).toContain("o-autocomplete-value-focus");
      expect(composerStore.currentContent).toBe("=SUM(");
    });

    test("key left or right selects adjacent cell instead of a proposal", async () => {
      registries.autoCompleteProviders.add("test", {
        getProposals() {
          return [{ text: "option 1" }];
        },
        selectProposal() {},
      });
      registerCleanup(() => registries.autoCompleteProviders.remove("test"));
      await typeInComposer("=SUM(");
      expect(composerStore.autocompleteProvider?.proposals).toHaveLength(1);
      expect(composerStore.showSelectionIndicator).toBe(true);
      expect(
        fixture.querySelector(".o-autocomplete-value")?.parentElement?.classList
      ).not.toContain("o-autocomplete-value-focus");
      await keyDown({ key: "ArrowRight" });
      expect(composerStore.currentContent).toBe("=SUM(B1");
      expect(fixture.querySelector(".o-autocomplete-value")).toBeNull();

      // now that a reference is selected, arrow up/down should select cells, not select a proposal
      await keyDown({ key: "ArrowDown" });
      expect(composerStore.currentContent).toBe("=SUM(B2");
    });

    test("autocomplete should not appear when typing '=S', stop the edition, and editing back", async () => {
      await typeInComposer("=S", true);
      expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(2);

      await keyDown({ key: "Escape" });
      await nextTick();
      await nextTick();
      expect(fixture.querySelector(".o-autocomplete-dropdown")).toBeFalsy();

      await typeInComposer("", true);
      expect(fixture.querySelector(".o-autocomplete-dropdown")).toBeFalsy();
    });

    test("show auto-complete and assistant at the same time", async () => {
      restoreDefaultFunctions();
      addPivot(model, "A1:A2");
      await typeInComposer("=PIVOT.VALUE(", true);
      expect(fixture.querySelector(".o-autocomplete-dropdown")).toBeTruthy();
      expect(fixture.querySelector(".o-formula-assistant-container")).toBeTruthy();
      expect(fixture.querySelector("#formula-assistant-details")?.className).not.toContain("show");
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
  });
});

describe("Autocomplete parenthesis", () => {
  beforeEach(async () => {
    ({ model, fixture, parent } = await mountComposerWrapper());
    // start composition
    parent.startComposition();
    await nextTick();
    composerEl = fixture.querySelector("div.o-composer")!;
    composerStore = parent.env.getStore(CellComposerStore);
  });

  test("=sum(1,2 + enter adds closing parenthesis", async () => {
    await typeInComposer("=sum(1,2");
    await keyDown({ key: "Enter" });
    expect(getCellText(model, "A1")).toBe("=sum(1,2)");
  });

  test("=sum( + enter + edit does not show the formula assistant", async () => {
    await typeInComposer("=sum(");
    expect(fixture.querySelector(".o-formula-assistant-container")).toBeTruthy();
    await keyDown({ key: "Enter" });
    await nextTick();
    await nextTick();
    expect(fixture.querySelector(".o-formula-assistant-container")).toBeFalsy();

    await typeInComposer("", true);
    expect(fixture.querySelector(".o-formula-assistant-container")).toBeFalsy();
  });

  test("=sum(1,2) + enter + edit sum does not add parenthesis", async () => {
    await typeInComposer("=sum(1,2)");
    await keyDown({ key: "Enter" });
    selectCell(model, "A1");
    //edit A1
    parent.setEdition({});
    composerStore.changeComposerCursorSelection(1, 4);
    await nextTick();

    await typeInComposer("if", false);
    expect(composerStore.currentContent).toBe("=if(1,2)");
  });

  test("=S( + edit S with autocomplete does not add left parenthesis", async () => {
    await typeInComposer("=S(");
    // go behind the letter "S"
    composerStore.stopComposerRangeSelection();
    composerStore.changeComposerCursorSelection(2, 2);
    await nextTick();
    // show autocomplete
    await typeInComposer("U", false);
    expect(composerStore.currentContent).toBe("=SU(");
    expect(composerStore.composerSelection).toEqual({ start: 3, end: 3 });
    expect(document.activeElement).toBe(composerEl);
    expect(fixture.querySelectorAll(".o-autocomplete-value")).toHaveLength(1);
    // select the SUM function
    await click(fixture.querySelector(".o-autocomplete-value")!);
    expect(composerEl.textContent).toBe("=SUM(");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(5);
    expect(composerStore.composerSelection).toEqual({ start: 5, end: 5 });
  });

  test("=sum(sum(1,2 + enter add 2 closing parenthesis", async () => {
    await typeInComposer("=sum(sum(1,2");
    await keyDown({ key: "Enter" });
    expect(getCellText(model, "A1")).toBe("=sum(sum(1,2))");
  });

  test("=sum(sum(1,2) + enter add 1 closing parenthesis", async () => {
    await typeInComposer("=sum(sum(1,2");
    await keyDown({ key: "Enter" });
    expect(getCellText(model, "A1")).toBe("=sum(sum(1,2))");
  });

  test('=sum("((((((((") + enter should not complete the parenthesis in the string', async () => {
    await typeInComposer('=sum("((((((((")');
    await keyDown({ key: "Enter" });
    expect(getCellText(model, "A1")).toBe('=sum("((((((((")');
  });

  test("=s + tab should allow to select a ref", async () => {
    await typeInComposer("=s");
    await keyDown({ key: "Tab" });
    expect(composerStore.editionMode).toBe("selecting");
  });
});

describe("composer Assistant", () => {
  test("render below the cell by default", async () => {
    ({ model, fixture, parent } = await mountComposerWrapper(Model.BuildSync(), {
      delimitation: { width: 500, height: 500 },
      rect: { width: DEFAULT_CELL_WIDTH, height: DEFAULT_CELL_HEIGHT, x: 150, y: 150 },
    }));
    await typeInComposer("=s");
    expect(fixture.querySelectorAll(".o-composer-assistant").length).toBe(1);
    const assistantEl = fixture.querySelector(".o-composer-assistant")! as HTMLElement;
    expect(assistantEl).toMatchSnapshot();
    expect(assistantEl.style.width).toBe("300px");
    expect(assistantEl.style.top).toBe("");
    expect(assistantEl.style.transform).toBe("");
  });

  test("render above the cell when not enough place below", async () => {
    ({ model, fixture, parent } = await mountComposerWrapper(Model.BuildSync(), {
      delimitation: { width: 200, height: 200 },
      rect: { width: DEFAULT_CELL_WIDTH, height: DEFAULT_CELL_HEIGHT, x: 150, y: 150 },
    }));
    await typeInComposer("=s");
    const assistantEL = fixture.querySelector(".o-composer-assistant")! as HTMLElement;
    expect(assistantEL).toMatchSnapshot();
    expect(assistantEL.style.width).toBe("300px");
    expect(assistantEL.style.top).toBe("-3px");
    expect(assistantEL.style.transform).toBe("translate(0, -100%)");
  });
});

describe("autocomplete boolean functions", () => {
  beforeEach(async () => {
    clearFunctions();
    functionRegistry.add("TRUE", {
      description: "TRUE",
      args: [],
      compute: () => true,
    });
    functionRegistry.add("FALSE", {
      description: "FALSE",
      args: [],
      compute: () => false,
    });
    ({ model, fixture, parent } = await mountComposerWrapper());
    parent.startComposition();
    await nextTick();
  });

  afterEach(() => {
    restoreDefaultFunctions();
  });

  test("partial TRUE show autocomplete", async () => {
    await typeInComposer("=TRU");
    expect(fixture.querySelector(".o-autocomplete-value")?.textContent).toBe("TRUE");
  });

  test.each(["=TRUE", "=true"])("exact match TRUE does not show autocomplete", async (formula) => {
    await typeInComposer(formula);
    expect(fixture.querySelector(".o-autocomplete-value")).toBeNull();
  });

  test("partial FALSE show autocomplete", async () => {
    await typeInComposer("=FAL");
    expect(fixture.querySelector(".o-autocomplete-value")?.textContent).toBe("FALSE");
  });

  test.each(["=FALSE", "=false"])(
    "exact match FALSE does not show autocomplete",
    async (formula) => {
      await typeInComposer(formula);
      expect(fixture.querySelector(".o-autocomplete-value")).toBeNull();
    }
  );
});
describe("composer entries", () => {
  beforeEach(() => {
    clearFunctions();
    functionRegistry
      .add("SEC", {
        description: "",
        args: [],
        compute: () => 1,
      })
      .add("SUPER", {
        description: "",
        args: [],
        compute: () => 1,
      })
      .add("SIN", {
        description: "",
        args: [],
        compute: () => 1,
      })
      .add("SLNT", {
        description: "",
        args: [],
        compute: () => 1,
      })
      .add("SECQ", {
        description: "",
        args: [],
        compute: () => 1,
      })
      .add("SAPER", {
        description: "",
        args: [],
        compute: () => 1,
      })
      .add("SLN", {
        description: "",
        args: [],
        compute: () => 1,
      });
  });
  test("Autocomplente entries are sorted by length and then alphanumerically", async () => {
    ({ fixture, parent } = await mountComposerWrapper());
    await typeInComposer("=S");
    const entries = fixture.querySelectorAll(".o-autocomplete-value");
    expect(entries[0].textContent).toBe("SEC");
    expect(entries[1].textContent).toBe("SIN");
    expect(entries[2].textContent).toBe("SLN");
    expect(entries[3].textContent).toBe("SECQ");
    expect(entries[4].textContent).toBe("SLNT");
    expect(entries[5].textContent).toBe("SAPER");
    expect(entries[6].textContent).toBe("SUPER");
  });
});
