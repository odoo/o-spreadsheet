import { App } from "@odoo/owl";
import { Model, Spreadsheet } from "../../src";
import { currenciesRegistry } from "../../src/registries/currencies_registry";
import { Currency } from "../../src/types/currency";
import { setSelection } from "../test_helpers/commands_helpers";
import { setInputValueAndTrigger, triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestFixture, mountSpreadsheet, nextTick, spyDispatch } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));
jest.useFakeTimers();

const selectors = {
  closeSidepanel: ".o-sidePanel .o-sidePanelClose",
  availableCurrencies: ".o-sidePanel .o-custom-currency .o-available-currencies",
  inputCode: ".o-sidePanel .o-custom-currency .o-subsection-left input",
  inputSymbol: ".o-sidePanel .o-custom-currency .o-subsection-right input",
  formatProposals: ".o-sidePanel .o-custom-currency .o-format-proposals",
  applyFormat: ".o-sidePanel .o-custom-currency .o-sidePanelButtons button",
};

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

const loadCurrencies = async () => {
  return currenciesData;
};

let fixture: HTMLElement;
let parent: Spreadsheet;
let app: App;
let dispatch;
let currenciesContent: { [key: string]: Currency };
let model: Model;

beforeEach(async () => {
  fixture = makeTestFixture();
  currenciesContent = Object.assign({}, currenciesRegistry.content);

  ({ app, parent } = await mountSpreadsheet(fixture, { model: new Model() }, { loadCurrencies }));
  model = parent.model;
  dispatch = spyDispatch(parent);

  parent.env.openSidePanel("CustomCurrency");
  await nextTick();
});

afterEach(() => {
  app.destroy();
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
      expect(document.querySelector(selectors.availableCurrencies)).toMatchSnapshot();
    });

    test("if currencies aren't provided in spreadsheet --> remove 'available currencies' section", async () => {
      // create spreadsheet without loadCurrencies in env
      currenciesRegistry.content = {};
      const fixture = makeTestFixture();
      const { app, parent } = await mountSpreadsheet(fixture);
      parent.env.openSidePanel("CustomCurrency");
      await nextTick();
      expect(fixture.querySelector(selectors.availableCurrencies)).toBe(null);
      fixture.remove();
      app.destroy();
    });

    // -------------------------------------------------------------------------
    // available currencies selector
    // -------------------------------------------------------------------------

    test("select currency in available currencies selector --> changes code input and symbol input", async () => {
      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe("");
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe("");

      setInputValueAndTrigger(selectors.availableCurrencies, "1", "change");
      await nextTick();

      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe(code1);
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe(
        symbol1
      );
    });

    test("select currency in available currencies selector --> changes currency proposals", async () => {
      setInputValueAndTrigger(selectors.availableCurrencies, "1", "change");
      await nextTick();
      expect(document.querySelector(selectors.formatProposals)).toMatchSnapshot();

      setInputValueAndTrigger(selectors.availableCurrencies, "2", "change");
      await nextTick();
      expect(document.querySelector(selectors.formatProposals)).toMatchSnapshot();
    });

    test("select currency in available currencies selector --> does not change proposal selected index", async () => {
      setInputValueAndTrigger(selectors.availableCurrencies, "1", "change");
      await nextTick();
      setInputValueAndTrigger(selectors.formatProposals, "6", "change");
      await nextTick();
      expect((document.querySelector(selectors.formatProposals) as HTMLSelectElement).value).toBe(
        "6"
      );

      setInputValueAndTrigger(selectors.availableCurrencies, "2", "change");
      await nextTick();
      expect((document.querySelector(selectors.formatProposals) as HTMLSelectElement).value).toBe(
        "6"
      );
    });

    test("select first currency in available currencies selector --> remove code input and symbol input", async () => {
      setInputValueAndTrigger(selectors.availableCurrencies, "1", "change");
      await nextTick();

      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe(code1);
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe(
        symbol1
      );

      setInputValueAndTrigger(selectors.availableCurrencies, "0", "change");
      await nextTick();

      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe("");
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe("");
    });

    // -------------------------------------------------------------------------
    // Input Symbol and Input Code
    // -------------------------------------------------------------------------

    test("disable formatProposals/applyFormat if inputSymbol and inputCode are empty", async () => {
      setInputValueAndTrigger(selectors.inputSymbol, "$", "input");
      setInputValueAndTrigger(selectors.inputCode, "", "input");
      await nextTick();
      expect(
        (document.querySelector(selectors.formatProposals) as HTMLSelectElement).disabled
      ).toBe(false);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );

      setInputValueAndTrigger(selectors.inputSymbol, "", "input");
      setInputValueAndTrigger(selectors.inputCode, "USD", "input");
      await nextTick();
      expect(
        (document.querySelector(selectors.formatProposals) as HTMLSelectElement).disabled
      ).toBe(false);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );

      setInputValueAndTrigger(selectors.inputSymbol, "  ", "input");
      setInputValueAndTrigger(selectors.inputCode, "", "input");
      await nextTick();
      expect(
        (document.querySelector(selectors.formatProposals) as HTMLSelectElement).disabled
      ).toBe(true);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    test("disable formatProposals/applyFormat if selected cells formats are same that the select currency format", async () => {
      setSelection(model, ["A1", "A2"]);
      await nextTick();
      setInputValueAndTrigger(selectors.inputSymbol, "$", "input");
      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );
      triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );

      setSelection(model, ["A2"]);
      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );
      setInputValueAndTrigger(selectors.inputSymbol, "€", "input");
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
      await nextTick();
      setSelection(model, ["A1", "A2"]);

      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );
    });

    test("not disable formatProposals/applyFormat if apply proposal and select other proposal", async () => {
      setInputValueAndTrigger(selectors.inputSymbol, "$", "input");
      setInputValueAndTrigger(selectors.inputCode, "USD", "input");
      await nextTick();
      setInputValueAndTrigger(selectors.formatProposals, "1", "change");
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );

      setInputValueAndTrigger(selectors.formatProposals, "2", "change");
      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );

      setInputValueAndTrigger(selectors.formatProposals, "1", "change");
      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    test("not disable formatProposals/applyFormat if apply proposal and select other currency", async () => {
      setInputValueAndTrigger(selectors.availableCurrencies, "1", "change");
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );

      setInputValueAndTrigger(selectors.availableCurrencies, "2", "change");
      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );

      setInputValueAndTrigger(selectors.availableCurrencies, "1", "change");
      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> init available currencies",
      async (selector) => {
        setInputValueAndTrigger(selectors.availableCurrencies, "1", "change");
        await nextTick();
        expect(
          (document.querySelector(selectors.availableCurrencies) as HTMLSelectElement).value
        ).toBe("1");

        setInputValueAndTrigger(selector, "test", "input");
        await nextTick();
        expect(
          (document.querySelector(selectors.availableCurrencies) as HTMLSelectElement).value
        ).toBe("0");
      }
    );

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> change currency proposals",
      async (selector) => {
        setInputValueAndTrigger(selectors.inputCode, "CODE", "input");
        await nextTick();
        setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL", "input");
        await nextTick();
        expect(document.querySelector(selectors.formatProposals)).toMatchSnapshot();

        setInputValueAndTrigger(selector, "TEST", "input");
        await nextTick();
        expect(document.querySelector(selectors.formatProposals)).toMatchSnapshot();
      }
    );

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> does not change proposal selected index",
      async (selector) => {
        setInputValueAndTrigger(selectors.availableCurrencies, "1", "change");
        await nextTick();
        setInputValueAndTrigger(selectors.formatProposals, "6", "change");
        await nextTick();
        expect((document.querySelector(selectors.formatProposals) as HTMLSelectElement).value).toBe(
          "6"
        );

        setInputValueAndTrigger(selector, "TEST", "input");
        await nextTick();
        expect((document.querySelector(selectors.formatProposals) as HTMLSelectElement).value).toBe(
          "6"
        );
      }
    );

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "have only one input filled --> display 4 proposals instead of 8",
      async (selector) => {
        setInputValueAndTrigger(selectors.availableCurrencies, "1", "change");
        await nextTick();
        expect(document.querySelectorAll(selectors.formatProposals + " option").length).toBe(8);

        setInputValueAndTrigger(selector, "  ", "input");
        await nextTick();

        expect(document.querySelectorAll(selectors.formatProposals + " option").length).toBe(4);
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
      setInputValueAndTrigger(selectors.formatProposals, proposalIndex, "change");
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
        sheetId: parent.env.model.getters.getActiveSheetId(),
        target: parent.env.model.getters.getSelectedZones(),
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
    "currency proposals depend on properties linked to the selected available currency",
    (availableCurrencyIndex, decimalPlaces, positionExpression) => {
      const decimalPlacesRegex = new RegExp("\\.0{" + decimalPlaces + "}");

      test.each([
        ["1", decimalPlacesRegex],
        ["3", decimalPlacesRegex],
        ["5", decimalPlacesRegex],
        ["7", decimalPlacesRegex],
      ])(
        "odd currency proposals depend on decimal places property",
        async (concernedIndex, decimalPlacesRegexp) => {
          setInputValueAndTrigger(selectors.availableCurrencies, availableCurrencyIndex, "change");
          await nextTick();
          setInputValueAndTrigger(selectors.formatProposals, concernedIndex, "change");
          await nextTick();
          triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
          await nextTick();
          expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
            sheetId: parent.env.model.getters.getActiveSheetId(),
            target: parent.env.model.getters.getSelectedZones(),
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
          setInputValueAndTrigger(selectors.availableCurrencies, availableCurrencyIndex, "change");
          await nextTick();
          setInputValueAndTrigger(selectors.formatProposals, concernedIndex, "change");
          await nextTick();
          triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
          await nextTick();
          expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
            sheetId: parent.env.model.getters.getActiveSheetId(),
            target: parent.env.model.getters.getSelectedZones(),
            format: expect.stringMatching(positionExpressionRegexp),
          });
        }
      );

      const twoDecimalPlacesRegex = /.0{2}/;

      test.each([["1"], ["3"], ["5"], ["7"]])(
        "odd currency proposals have two decimal places when no available currency is selected",
        async (concernedIndex) => {
          setInputValueAndTrigger(selectors.availableCurrencies, "0", "change");
          await nextTick();
          setInputValueAndTrigger(selectors.inputCode, "CODE", "input");
          await nextTick();
          setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL", "input");
          await nextTick();
          setInputValueAndTrigger(selectors.formatProposals, concernedIndex, "change");
          await nextTick();
          triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
          await nextTick();
          expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
            sheetId: parent.env.model.getters.getActiveSheetId(),
            target: parent.env.model.getters.getSelectedZones(),
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
        "currency first four proposals start by expression placed after digits when no available currency is selected",
        async (concernedIndex, positionExpressionRegexp) => {
          setInputValueAndTrigger(selectors.availableCurrencies, "0", "change");
          await nextTick();
          setInputValueAndTrigger(selectors.inputCode, "CODE", "input");
          await nextTick();
          setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL", "input");
          await nextTick();
          setInputValueAndTrigger(selectors.formatProposals, concernedIndex, "change");
          await nextTick();
          triggerMouseEvent(document.querySelector(selectors.applyFormat), "click");
          await nextTick();
          expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING", {
            sheetId: parent.env.model.getters.getActiveSheetId(),
            target: parent.env.model.getters.getSelectedZones(),
            format: expect.stringMatching(positionExpressionRegexp),
          });
        }
      );
    }
  );
});
