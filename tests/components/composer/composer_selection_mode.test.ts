import { Spreadsheet } from "../../../src";
import { Model } from "../../../src/model";
import {
  makeTestFixture,
  mountSpreadsheet,
  startGridComposition,
  typeInComposerGrid as typeInComposerGridHelper,
} from "../../test_helpers/helpers";
import { ContentEditableHelper } from "../__mocks__/content_editable_helper";

jest.mock("../../../src/components/composer/content_editable_helper", () =>
  require("../__mocks__/content_editable_helper")
);

let model: Model;
let composerEl: Element;
let fixture: HTMLElement;
let parent: Spreadsheet;
let cehMock: ContentEditableHelper;

async function startComposition(key?: string) {
  const composerEl = await startGridComposition(key);
  // @ts-ignore
  cehMock = window.mockContentHelper;
  return composerEl;
}

async function typeInComposerGrid(text: string, fromScratch: boolean = true) {
  const composerEl = await typeInComposerGridHelper(text, fromScratch);
  // @ts-ignore
  cehMock = window.mockContentHelper;
  return composerEl;
}

beforeEach(async () => {
  fixture = makeTestFixture();
  parent = await mountSpreadsheet(fixture);
  model = parent.model;
});

afterEach(() => {
  parent.destroy();
  fixture.remove();
});

describe("change selecting mode when typing specific token value", () => {
  const matchingValues = [",", "+", "*", "="];
  const mismatchingValues = ["1", '"coucou"', "TRUE", "SUM", "A2"];
  const formulas = ["=", "=SUM("];

  describe.each(formulas)("typing %s followed by", (formula) => {
    test.each(matchingValues.concat(["("]))(
      "a matching value --> activate 'waitingForRangeSelection' mode",
      async (matchingValue) => {
        const content = formula + matchingValue;
        await startComposition();
        composerEl = await typeInComposerGrid(content);
        expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
        expect(composerEl.textContent).toBe(content);
        expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
        expect(cehMock.selectionState.position).toBe(content.length);
      }
    );

    test.each(mismatchingValues.concat([")"]))(
      "a mismatching value --> not activate 'waitingForRangeSelection' mode",
      async (mismatchingValue) => {
        const content = formula + mismatchingValue;
        await startComposition();
        composerEl = await typeInComposerGrid(content);
        expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
        expect(composerEl.textContent).toBe(content);
        expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
      }
    );

    test.each(matchingValues.concat(["("]))(
      "a matching value & spaces --> activate 'waitingForRangeSelection' mode",
      async (matchingValue) => {
        const content = formula + matchingValue;
        const newContent = content + "   ";
        await startComposition();
        composerEl = await typeInComposerGrid(newContent);
        expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
        expect(composerEl.textContent).toBe(newContent);
        expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
        expect(cehMock.selectionState.position).toBe(newContent.length);
      }
    );

    test.each(mismatchingValues.concat([")"]))(
      "a mismatching value & spaces --> not activate 'waitingForRangeSelection' mode",
      async (mismatchingValue) => {
        const content = formula + mismatchingValue;
        await startComposition();
        composerEl = await typeInComposerGrid(content + "   ");
        expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
        expect(composerEl.textContent).toBe(content + "   ");
        expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
      }
    );

    test.each(mismatchingValues.concat([")"]))(
      "a UNKNOWN token & a matching value --> not activate 'waitingForRangeSelection' mode",
      async (matchingValue) => {
        const content = formula + "'" + matchingValue;
        await startComposition();
        composerEl = await typeInComposerGrid(content);
        expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
        expect(composerEl.textContent).toBe(content);
      }
    );
  });

  test.each([",", "+", "*", ")", "("])(
    "typing a matching values (except '=') --> not activate 'waitingForRangeSelection' mode",
    async (value) => {
      await startComposition();
      composerEl = await typeInComposerGrid(value);
      expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
      expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
      expect(composerEl.textContent).toBe(value);
    }
  );

  test("typing '='--> activate 'waitingForRangeSelection' mode", async () => {
    await startComposition();
    composerEl = await typeInComposerGrid("=");
    expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
    expect(composerEl.textContent).toBe("=");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(1);
  });

  test("typing '=' & spaces --> activate 'waitingForRangeSelection' mode", async () => {
    await startComposition();
    const content = "=   ";
    composerEl = await typeInComposerGrid(content);
    expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
    expect(composerEl.textContent).toBe("=   ");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(content.length);
  });
});
