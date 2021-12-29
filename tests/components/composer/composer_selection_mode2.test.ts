import { Spreadsheet } from "../../../src";
import { Model } from "../../../src/model";
import {
  makeTestFixture,
  mountSpreadsheet,
  nextTick,
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

  async function moveToStart() {
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
    await nextTick();
    model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    await nextTick();
  }
  describe.each(formulas)("typing %s followed by", (formula) => {
    test.each(matchingValues.concat([")"]))(
      "a matching value & located before matching value --> activate 'waitingForRangeSelection' mode",
      async (matchingValue) => {
        await startComposition();
        await typeInComposerGrid(matchingValue);
        await moveToStart();
        composerEl = await typeInComposerGrid(formula + ",");
        expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
        expect(composerEl.textContent).toBe(formula + "," + matchingValue);
        expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
        expect(cehMock.selectionState.position).toBe((formula + ",").length);
      }
    );

    test.each(mismatchingValues.concat(["("]))(
      "a matching value & located before mismatching value --> not activate 'waitingForRangeSelection' mode",
      async (mismatchingValue) => {
        await startComposition();
        await typeInComposerGrid(mismatchingValue);
        await moveToStart();
        composerEl = await typeInComposerGrid(formula + ",");
        expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
        expect(composerEl.textContent).toBe(formula + "," + mismatchingValue);
      }
    );

    test.each(matchingValues.concat([")"]))(
      "a matching value & spaces & located before matching value --> activate 'waitingForRangeSelection' mode",
      async (matchingValue) => {
        await startComposition();
        await typeInComposerGrid(matchingValue);
        await moveToStart();
        const formulaInput = formula + ",  ";
        composerEl = await typeInComposerGrid(formulaInput);
        expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
        expect(composerEl.textContent).toBe(formulaInput + matchingValue);
        expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
        expect(cehMock.selectionState.position).toBe(formulaInput.length);
      }
    );

    test.each(mismatchingValues.concat(["("]))(
      "a matching value & spaces & located before mismatching value --> not activate 'waitingForRangeSelection' mode",
      async (mismatchingValue) => {
        await startComposition();
        await typeInComposerGrid(mismatchingValue);
        await moveToStart();
        composerEl = await typeInComposerGrid(formula + ",  ");
        expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
        expect(composerEl.textContent).toBe(formula + ",  " + mismatchingValue);
        expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
      }
    );

    test.each(matchingValues.concat([")"]))(
      "a matching value & located before spaces & matching value --> activate 'waitingForRangeSelection' mode",
      async (matchingValue) => {
        await startComposition();
        await typeInComposerGrid("   " + matchingValue);
        await moveToStart();
        composerEl = await typeInComposerGrid(formula + ",");
        expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
        expect(composerEl.textContent).toBe(formula + ",   " + matchingValue);
        expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
        expect(cehMock.selectionState.position).toBe((formula + ",").length);
      }
    );

    test.each(mismatchingValues.concat(["("]))(
      "a matching value & located before spaces & mismatching value --> not activate 'waitingForRangeSelection' mode",
      async (mismatchingValue) => {
        await startComposition();
        await typeInComposerGrid("   " + mismatchingValue);
        await moveToStart();
        composerEl = await typeInComposerGrid(formula + ",");
        expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
        expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        expect(composerEl.textContent).toBe(formula + ",   " + mismatchingValue);
      }
    );
  });
});
