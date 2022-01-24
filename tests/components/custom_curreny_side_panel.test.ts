import { Component, hooks, tags } from "@odoo/owl";
import { Model, Spreadsheet } from "../../src";
import { currenciesRegistry, Currency } from "../../src/registries";
import { DispatchResult, SpreadsheetEnv } from "../../src/types";
import { setInputValueAndTrigger, triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestFixture, nextTick } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));
jest.useFakeTimers();

const { xml } = tags;
const { useRef } = hooks;

const selectors = {
  closeSidepanel: ".o-sidePanel .o-sidePanelClose",
  searchCurrency: ".o-sidePanel .o-custom-currency .o-section:nth-child(1) select",
  inputSymbol: ".o-sidePanel .o-custom-currency .o-section:nth-child(2) .o-subsection-left input",
  inputCode: ".o-sidePanel .o-custom-currency .o-section:nth-child(2) .o-subsection-right input",
  currencyProposals:
    ".o-sidePanel .o-custom-currency .o-section:nth-child(3) .o-subsection-left select",
  applyFormat: ".o-sidePanel .o-custom-currency .o-section:nth-child(3) .o-subsection-right button",
};

class Parent extends Component<any> {
  static template = xml/* xml */ `<Spreadsheet t-ref="spreadsheet"  data="data"/>`;
  static components = { Spreadsheet };
  spreadsheet: any = useRef("spreadsheet");
  get spreadsheetEnv(): SpreadsheetEnv {
    return this.spreadsheet.comp.env;
  }
  get model(): Model {
    return this.spreadsheet.comp.model;
  }
}

const [code1, code2] = ["ABC", "DEF"];
const [symbol1, symbol2] = ["µ", "XD"];
const [decimalPlaces1, decimalPlaces2] = [3, 4];
const [position1, position2]: ("after" | "before")[] = ["after", "before"];

const currenciesData: Currency[] = [
  {
    name: "3 decimal places / expression position after",
    code: code1,
    symbol: symbol1,
    decimalPlaces: decimalPlaces1,
    position: position1,
  },
  {
    name: "4 decimal places / expression position before",
    code: code2,
    symbol: symbol2,
    decimalPlaces: decimalPlaces2,
    position: position2,
  },
];

let fixture: HTMLElement;
let parent: Parent;
let env: SpreadsheetEnv;
let currenciesContent: { [key: string]: Currency };

beforeEach(async () => {
  fixture = makeTestFixture();
  parent = new Parent();
  await parent.mount(fixture);

  env = parent.spreadsheetEnv;
  env.dispatch = jest.fn(() => DispatchResult.Success);

  currenciesContent = Object.assign({}, currenciesRegistry.content);
  await nextTick();

  currenciesData.forEach((currency, index) => {
    currenciesRegistry.add(index.toString(), currency);
  });
  await nextTick();

  env.openSidePanel("CustomCurrency");
  await nextTick();
});

afterEach(() => {
  parent.destroy();
  fixture.remove();
  currenciesRegistry.content = currenciesContent;
});

describe("custom currency sidePanel component", () => {
  describe("Sidepanel", () => {
    // -------------------------------------------------------------------------
    // Close button
    // -------------------------------------------------------------------------
    test("Can close the custom currency side panel", async () => {
      expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
      triggerMouseEvent(document.querySelector(selectors.closeSidepanel), "click");
      await nextTick();
      expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
    });

    // -------------------------------------------------------------------------
    // provided currencies
    // -------------------------------------------------------------------------

    test("if currencies are provided in spreadsheet --> display this currencies", () => {
      expect(document.querySelector(selectors.searchCurrency)).toMatchSnapshot();
    });

    test("if currencies aren't provided in spreadsheet --> remove search section", async () => {
      triggerMouseEvent(document.querySelector(selectors.closeSidepanel), "click");
      await nextTick();

      currenciesRegistry.content = {};
      await nextTick();

      parent.spreadsheetEnv.openSidePanel("CustomCurrency");
      await nextTick();
      expect(document.querySelector(selectors.searchCurrency)).toBe(null);
    });

    // -------------------------------------------------------------------------
    // search currency selector
    // -------------------------------------------------------------------------

    test("select currency in search selector --> changes code input and symbol input", async () => {
      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe("");
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe("");

      setInputValueAndTrigger(selectors.searchCurrency, "1", "change");
      await nextTick();

      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe(code1);
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe(
        symbol1
      );
    });

    test("select currency in search selector --> changes currency proposals", async () => {
      setInputValueAndTrigger(selectors.searchCurrency, "1", "change");
      await nextTick();
      expect(document.querySelector(selectors.currencyProposals)).toMatchSnapshot();

      setInputValueAndTrigger(selectors.searchCurrency, "2", "change");
      await nextTick();
      expect(document.querySelector(selectors.currencyProposals)).toMatchSnapshot();
    });

    test("select currency in search selector --> does not change proposal selected index", async () => {
      setInputValueAndTrigger(selectors.searchCurrency, "1", "change");
      await nextTick();
      setInputValueAndTrigger(selectors.currencyProposals, "6", "change");
      await nextTick();
      expect((document.querySelector(selectors.currencyProposals) as HTMLSelectElement).value).toBe(
        "6"
      );

      setInputValueAndTrigger(selectors.searchCurrency, "2", "change");
      await nextTick();
      expect((document.querySelector(selectors.currencyProposals) as HTMLSelectElement).value).toBe(
        "6"
      );
    });

    test("select first currency in search selector --> remove code input and symbol input", async () => {
      setInputValueAndTrigger(selectors.searchCurrency, "1", "change");
      await nextTick();

      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe(code1);
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe(
        symbol1
      );

      setInputValueAndTrigger(selectors.searchCurrency, "0", "change");
      await nextTick();

      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe("");
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe("");
    });

    // -------------------------------------------------------------------------
    // Input SYmbol and Input Code
    // -------------------------------------------------------------------------

    test("disable currencyProposals/applyFormat if inputSymbol and inputCode are empty", async () => {
      setInputValueAndTrigger(selectors.inputSymbol, "$", "input");
      setInputValueAndTrigger(selectors.inputCode, "", "input");
      await nextTick();
      expect(
        (document.querySelector(selectors.currencyProposals) as HTMLSelectElement).disabled
      ).toBe(false);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );

      setInputValueAndTrigger(selectors.inputSymbol, "", "input");
      setInputValueAndTrigger(selectors.inputCode, "USD", "input");
      await nextTick();
      expect(
        (document.querySelector(selectors.currencyProposals) as HTMLSelectElement).disabled
      ).toBe(false);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );

      setInputValueAndTrigger(selectors.inputSymbol, "  ", "input");
      setInputValueAndTrigger(selectors.inputCode, "", "input");
      await nextTick();
      expect(
        (document.querySelector(selectors.currencyProposals) as HTMLSelectElement).disabled
      ).toBe(true);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> init search",
      async (selector) => {
        setInputValueAndTrigger(selectors.searchCurrency, "1", "change");
        await nextTick();
        expect((document.querySelector(selectors.searchCurrency) as HTMLSelectElement).value).toBe(
          "1"
        );

        setInputValueAndTrigger(selector, "test", "input");
        await nextTick();
        expect((document.querySelector(selectors.searchCurrency) as HTMLSelectElement).value).toBe(
          "0"
        );
      }
    );

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> change currency proposals",
      async (selector) => {
        setInputValueAndTrigger(selectors.inputCode, "CODE", "input");
        await nextTick();
        setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL", "input");
        await nextTick();
        expect(document.querySelector(selectors.currencyProposals)).toMatchSnapshot();

        setInputValueAndTrigger(selector, "TEST", "input");
        await nextTick();
        expect(document.querySelector(selectors.currencyProposals)).toMatchSnapshot();
      }
    );

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> does not change proposal selected index",
      async (selector) => {
        setInputValueAndTrigger(selectors.searchCurrency, "1", "change");
        await nextTick();
        setInputValueAndTrigger(selectors.currencyProposals, "6", "change");
        await nextTick();
        expect(
          (document.querySelector(selectors.currencyProposals) as HTMLSelectElement).value
        ).toBe("6");

        setInputValueAndTrigger(selector, "TEST", "input");
        await nextTick();
        expect(
          (document.querySelector(selectors.currencyProposals) as HTMLSelectElement).value
        ).toBe("6");
      }
    );

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "have only one input filled --> display 4 proposals instead of 8",
      async (selector) => {
        setInputValueAndTrigger(selectors.searchCurrency, "1", "change");
        await nextTick();
        expect(document.querySelectorAll(selectors.currencyProposals + " option").length).toBe(8);

        setInputValueAndTrigger(selector, "  ", "input");
        await nextTick();

        expect(document.querySelectorAll(selectors.currencyProposals + " option").length).toBe(4);
      }
    );

    // -------------------------------------------------------------------------
    // Currency proposals
    // -------------------------------------------------------------------------
    test.each([
      ["0", "#,##0[$$]"],
      ["1", "#,##0.00[$$]"],
      ["2", "#,##0[$ USD $]"],
      ["3", "#,##0.00[$ USD $]"],
      ["4", "[$$]#,##0"],
      ["5", "[$$]#,##0.00"],
      ["6", "[$USD $]#,##0"],
      ["7", "[$USD $]#,##0.00"],
    ])("format applied depends on selected proposal", async (proposalIndex, formatResult) => {
      setInputValueAndTrigger(selectors.inputSymbol, "$", "input");
      await nextTick();
      setInputValueAndTrigger(selectors.inputCode, "USD", "input");
      await nextTick();
      setInputValueAndTrigger(selectors.currencyProposals, proposalIndex, "change");
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
      await nextTick();
      expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: env.getters.getActiveSheetId(),
        target: env.getters.getSelectedZones(),
        format: formatResult,
      });
    });
  });

  const beforePositionExpressionRegex = /^\[/;
  const afterPositionExpressionRegex = /\]$/;

  describe.each([
    ["1", decimalPlaces1, position1],
    ["2", decimalPlaces2, position2],
  ])(
    "currency proposals depend on properties linked to the searched currency",
    (searchIndex, decimalPlaces, positionExpression) => {
      const decimalPlacesRegex = new RegExp("\\.0{" + decimalPlaces + "}");

      test.each([
        ["1", decimalPlacesRegex],
        ["3", decimalPlacesRegex],
        ["5", decimalPlacesRegex],
        ["7", decimalPlacesRegex],
      ])(
        "odd currency proposals depend on decimal places property",
        async (concernedIndex, decimalPlacesRegexp) => {
          setInputValueAndTrigger(selectors.searchCurrency, searchIndex, "change");
          await nextTick();
          setInputValueAndTrigger(selectors.currencyProposals, concernedIndex, "change");
          await nextTick();
          triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
          await nextTick();
          expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
            sheetId: env.getters.getActiveSheetId(),
            target: env.getters.getSelectedZones(),
            format: expect.stringMatching(decimalPlacesRegexp),
          });
        }
      );

      const firstFourProposalsPositionRegex =
        positionExpression === "after"
          ? afterPositionExpressionRegex
          : beforePositionExpressionRegex;
      const lastFourProposalsPositionRegex =
        positionExpression === "after"
          ? beforePositionExpressionRegex
          : afterPositionExpressionRegex;

      test.each([
        ["0", firstFourProposalsPositionRegex],
        ["1", firstFourProposalsPositionRegex],
        ["2", firstFourProposalsPositionRegex],
        ["3", firstFourProposalsPositionRegex],
        ["4", lastFourProposalsPositionRegex],
        ["5", lastFourProposalsPositionRegex],
        ["6", lastFourProposalsPositionRegex],
        ["7", lastFourProposalsPositionRegex],
      ])(
        "currency proposals depend on position property",
        async (concernedIndex, positionExpressionRegexp) => {
          setInputValueAndTrigger(selectors.searchCurrency, searchIndex, "change");
          await nextTick();
          setInputValueAndTrigger(selectors.currencyProposals, concernedIndex, "change");
          await nextTick();
          triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
          await nextTick();
          expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
            sheetId: env.getters.getActiveSheetId(),
            target: env.getters.getSelectedZones(),
            format: expect.stringMatching(positionExpressionRegexp),
          });
        }
      );

      const twoDecimalPlacesRegex = /.0{2}/;

      test.each([["1"], ["3"], ["5"], ["7"]])(
        "odd currency proposals have two decimal places when no currency is searched",
        async (concernedIndex) => {
          setInputValueAndTrigger(selectors.searchCurrency, "0", "change");
          await nextTick();
          setInputValueAndTrigger(selectors.inputCode, "CODE", "input");
          await nextTick();
          setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL", "input");
          await nextTick();
          setInputValueAndTrigger(selectors.currencyProposals, concernedIndex, "change");
          await nextTick();
          triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
          await nextTick();
          expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
            sheetId: env.getters.getActiveSheetId(),
            target: env.getters.getSelectedZones(),
            format: expect.stringMatching(twoDecimalPlacesRegex),
          });
        }
      );

      test.each([
        ["0", afterPositionExpressionRegex],
        ["1", afterPositionExpressionRegex],
        ["2", afterPositionExpressionRegex],
        ["3", afterPositionExpressionRegex],
        ["4", beforePositionExpressionRegex],
        ["5", beforePositionExpressionRegex],
        ["6", beforePositionExpressionRegex],
        ["7", beforePositionExpressionRegex],
      ])(
        "currency first four proposals start by expression placed after digits when no currency is searched",
        async (concernedIndex, positionExpressionRegexp) => {
          setInputValueAndTrigger(selectors.searchCurrency, "0", "change");
          await nextTick();
          setInputValueAndTrigger(selectors.inputCode, "CODE", "input");
          await nextTick();
          setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL", "input");
          await nextTick();
          setInputValueAndTrigger(selectors.currencyProposals, concernedIndex, "change");
          await nextTick();
          triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
          await nextTick();
          expect(env.dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
            sheetId: env.getters.getActiveSheetId(),
            target: env.getters.getSelectedZones(),
            format: expect.stringMatching(positionExpressionRegexp),
          });
        }
      );
    }
  );
});
