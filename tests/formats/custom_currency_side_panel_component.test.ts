import { Model } from "../../src";
import { CustomCurrencyPanel } from "../../src/components/side_panel/custom_currency/custom_currency";
import { currenciesRegistry } from "../../src/registries/currencies_registry";
import { Currency } from "../../src/types/currency";
import { setSelection, updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { click, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import { getCell } from "../test_helpers/getters_helpers";
import { mountComponent, nextTick, spyModelDispatch } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));
jest.useFakeTimers();

const selectors = {
  availableCurrencies: ".o-custom-currency .o-available-currencies",
  inputCode: ".o-custom-currency .o-subsection-left input",
  inputSymbol: ".o-custom-currency .o-subsection-right input",
  formatProposals: ".o-custom-currency .o-format-proposals",
  formatProposalOptions: ".o-custom-currency .o-format-proposals option",
  accountingFormatCheckbox: ".o-custom-currency input[name='accountingFormat']",
  applyFormat: ".o-custom-currency .o-sidePanelButtons button",
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

let dispatch: jest.SpyInstance;
let currenciesContent: { [key: string]: Currency };
let model: Model;
let fixture: HTMLElement;

function getExampleValues() {
  const tableRows = fixture.querySelectorAll(".o-custom-currency table tr");
  return Array.from(tableRows).map((row) => row.children[1].textContent);
}

describe("custom currency sidePanel component", () => {
  beforeEach(async () => {
    currenciesContent = Object.assign({}, currenciesRegistry.content);

    ({ model, fixture } = await mountComponent(CustomCurrencyPanel, {
      env: { loadCurrencies },
      model: Model.BuildSync({}, { external: { loadCurrencies } }),
      props: { onCloseSidePanel: () => {} },
    }));
    dispatch = spyModelDispatch(model);
    await nextTick();
  });

  afterEach(() => {
    currenciesRegistry.content = currenciesContent;
  });

  describe("Sidepanel", () => {
    // -------------------------------------------------------------------------
    // available currencies selector
    // -------------------------------------------------------------------------

    test("select currency in available currencies selector --> changes code input and symbol input", async () => {
      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe("");
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe("");

      await setInputValueAndTrigger(selectors.availableCurrencies, "1");

      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe(code1);
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe(
        symbol1
      );
    });

    test("select currency in available currencies selector --> changes currency proposals", async () => {
      await setInputValueAndTrigger(selectors.availableCurrencies, "1");
      expect(document.querySelector(selectors.formatProposals)).toMatchSnapshot();

      await setInputValueAndTrigger(selectors.availableCurrencies, "2");
      expect(document.querySelector(selectors.formatProposals)).toMatchSnapshot();
    });

    test("select currency in available currencies selector --> does not change proposal selected index", async () => {
      await setInputValueAndTrigger(selectors.availableCurrencies, "1");
      await setInputValueAndTrigger(selectors.formatProposals, "6");
      expect((document.querySelector(selectors.formatProposals) as HTMLSelectElement).value).toBe(
        "6"
      );

      await setInputValueAndTrigger(selectors.availableCurrencies, "2");
      expect((document.querySelector(selectors.formatProposals) as HTMLSelectElement).value).toBe(
        "6"
      );
    });

    test("select first currency in available currencies selector --> remove code input and symbol input", async () => {
      await setInputValueAndTrigger(selectors.availableCurrencies, "1");

      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe(code1);
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe(
        symbol1
      );

      await setInputValueAndTrigger(selectors.availableCurrencies, "0");

      expect((document.querySelector(selectors.inputCode) as HTMLInputElement).value).toBe("");
      expect((document.querySelector(selectors.inputSymbol) as HTMLInputElement).value).toBe("");
    });

    // -------------------------------------------------------------------------
    // Input Symbol and Input Code
    // -------------------------------------------------------------------------

    test("disable formatProposals/applyFormat if inputSymbol and inputCode are empty", async () => {
      setInputValueAndTrigger(selectors.inputSymbol, "$");
      await setInputValueAndTrigger(selectors.inputCode, "");
      expect(
        (document.querySelector(selectors.formatProposals) as HTMLSelectElement).disabled
      ).toBe(false);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );

      setInputValueAndTrigger(selectors.inputSymbol, "");
      await setInputValueAndTrigger(selectors.inputCode, "USD");
      expect(
        (document.querySelector(selectors.formatProposals) as HTMLSelectElement).disabled
      ).toBe(false);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );

      setInputValueAndTrigger(selectors.inputSymbol, "  ");
      await setInputValueAndTrigger(selectors.inputCode, "");
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
      await setInputValueAndTrigger(selectors.inputSymbol, "$");
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );
      await click(fixture, selectors.applyFormat);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );

      setSelection(model, ["A2"]);
      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );
      await setInputValueAndTrigger(selectors.inputSymbol, "€");
      await click(fixture, selectors.applyFormat);
      setSelection(model, ["A1", "A2"]);

      await nextTick();
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );
    });

    test("not disable formatProposals/applyFormat if apply proposal and select other proposal", async () => {
      setInputValueAndTrigger(selectors.inputSymbol, "$");
      await setInputValueAndTrigger(selectors.inputCode, "USD");
      await setInputValueAndTrigger(selectors.formatProposals, "1");
      await click(fixture, selectors.applyFormat);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );

      await setInputValueAndTrigger(selectors.formatProposals, "2");
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );

      await setInputValueAndTrigger(selectors.formatProposals, "1");
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    test("not disable formatProposals/applyFormat if apply proposal and select other currency", async () => {
      await setInputValueAndTrigger(selectors.availableCurrencies, "1");
      await click(fixture, selectors.applyFormat);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );

      await setInputValueAndTrigger(selectors.availableCurrencies, "2");
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );

      await setInputValueAndTrigger(selectors.availableCurrencies, "1");
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    test("not disable formatProposals/applyFormat if apply proposal and check accounting format checkbox", async () => {
      await setInputValueAndTrigger(selectors.availableCurrencies, "1");
      await click(fixture, selectors.applyFormat);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        true
      );

      await click(fixture, selectors.accountingFormatCheckbox);
      expect((document.querySelector(selectors.applyFormat) as HTMLButtonElement).disabled).toBe(
        false
      );
    });

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> init available currencies",
      async (selector) => {
        await setInputValueAndTrigger(selectors.availableCurrencies, "1");
        expect(
          (document.querySelector(selectors.availableCurrencies) as HTMLSelectElement).value
        ).toBe("1");

        await setInputValueAndTrigger(selector, "test");
        expect(
          (document.querySelector(selectors.availableCurrencies) as HTMLSelectElement).value
        ).toBe("0");
      }
    );

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> change currency proposals",
      async (selector) => {
        await setInputValueAndTrigger(selectors.inputCode, "CODE");
        await setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL");
        expect(document.querySelector(selectors.formatProposals)).toMatchSnapshot();

        await setInputValueAndTrigger(selector, "TEST");
        expect(document.querySelector(selectors.formatProposals)).toMatchSnapshot();
      }
    );

    test("currency proposals uses locale format", async () => {
      await setInputValueAndTrigger(selectors.availableCurrencies, "1");
      const proposals = [...document.querySelectorAll(selectors.formatProposalOptions)];
      expect(proposals.map((el) => el.textContent)).toEqual([
        "1,000µ",
        "1,000.000µ",
        "1,000 ABC µ",
        "1,000.000 ABC µ",
        "µ1,000",
        "µ1,000.000",
        "ABC µ1,000",
        "ABC µ1,000.000",
      ]);
      updateLocale(model, FR_LOCALE);
      await nextTick();
      expect(proposals.map((el) => el.textContent)).toEqual([
        "1 000µ",
        "1 000,000µ",
        "1 000 ABC µ",
        "1 000,000 ABC µ",
        "µ1 000",
        "µ1 000,000",
        "ABC µ1 000",
        "ABC µ1 000,000",
      ]);
    });

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> does not change proposal selected index",
      async (selector) => {
        await setInputValueAndTrigger(selectors.availableCurrencies, "1");
        await setInputValueAndTrigger(selectors.formatProposals, "6");
        expect((document.querySelector(selectors.formatProposals) as HTMLSelectElement).value).toBe(
          "6"
        );

        await setInputValueAndTrigger(selector, "TEST");
        expect((document.querySelector(selectors.formatProposals) as HTMLSelectElement).value).toBe(
          "6"
        );
      }
    );

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "have only one input filled --> display 4 proposals instead of 8",
      async (selector) => {
        await setInputValueAndTrigger(selectors.availableCurrencies, "1");
        expect(document.querySelectorAll(selectors.formatProposals + " option").length).toBe(8);

        await setInputValueAndTrigger(selector, "  ");

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
      await setInputValueAndTrigger(selectors.inputSymbol, "$");
      await setInputValueAndTrigger(selectors.inputCode, "USD");
      await setInputValueAndTrigger(selectors.formatProposals, proposalIndex);
      await click(fixture, selectors.applyFormat);
      expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
        sheetId: model.getters.getActiveSheetId(),
        target: model.getters.getSelectedZones(),
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
          await setInputValueAndTrigger(selectors.availableCurrencies, availableCurrencyIndex);
          await setInputValueAndTrigger(selectors.formatProposals, concernedIndex);
          await click(fixture, selectors.applyFormat);
          expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
            sheetId: model.getters.getActiveSheetId(),
            target: model.getters.getSelectedZones(),
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
          await setInputValueAndTrigger(selectors.availableCurrencies, availableCurrencyIndex);
          await setInputValueAndTrigger(selectors.formatProposals, concernedIndex);
          await click(fixture, selectors.applyFormat);
          expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
            sheetId: model.getters.getActiveSheetId(),
            target: model.getters.getSelectedZones(),
            format: expect.stringMatching(positionExpressionRegexp),
          });
        }
      );

      const twoDecimalPlacesRegex = /.0{2}/;

      test.each([["1"], ["3"], ["5"], ["7"]])(
        "odd currency proposals have two decimal places when no available currency is selected",
        async (concernedIndex) => {
          await setInputValueAndTrigger(selectors.availableCurrencies, "0");
          await setInputValueAndTrigger(selectors.inputCode, "CODE");
          await setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL");
          await setInputValueAndTrigger(selectors.formatProposals, concernedIndex);
          await click(fixture, selectors.applyFormat);
          expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
            sheetId: model.getters.getActiveSheetId(),
            target: model.getters.getSelectedZones(),
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
          await setInputValueAndTrigger(selectors.availableCurrencies, "0");
          await setInputValueAndTrigger(selectors.inputCode, "CODE");
          await setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL");
          await setInputValueAndTrigger(selectors.formatProposals, concernedIndex);
          await click(fixture, selectors.applyFormat);
          expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
            sheetId: model.getters.getActiveSheetId(),
            target: model.getters.getSelectedZones(),
            format: expect.stringMatching(positionExpressionRegexp),
          });
        }
      );
    }
  );

  test("Can apply accounting format in the panel", async () => {
    await setInputValueAndTrigger(selectors.inputSymbol, "€");

    expect(getExampleValues()).toEqual(["1,235€", "-1,235€", "0€"]);
    await click(fixture, selectors.accountingFormatCheckbox);
    expect(getExampleValues()).toEqual(["1,235€", "(1,235)€", "- €"]);
    await click(fixture, selectors.applyFormat);
    expect(getCell(model, "A1")?.format).toBe("#,##0[$€];(#,##0)[$€];- [$€]");
  });
});

describe("Provided Currencies", () => {
  beforeEach(async () => {
    currenciesContent = Object.assign({}, currenciesRegistry.content);
  });

  afterEach(() => {
    currenciesRegistry.content = currenciesContent;
  });

  test("if currencies are provided in spreadsheet --> display this currencies", async () => {
    const { fixture } = await mountComponent(CustomCurrencyPanel, {
      env: { loadCurrencies },
      model: Model.BuildSync({}, { external: { loadCurrencies } }),
      props: { onCloseSidePanel: () => {} },
    });
    expect(fixture.querySelector(selectors.availableCurrencies)).toMatchSnapshot();
  });

  test("if currencies aren't provided in spreadsheet --> remove 'available currencies' section", async () => {
    const { fixture } = await mountComponent(CustomCurrencyPanel, {
      env: { loadCurrencies: undefined },
      model: Model.BuildSync({}),
      props: { onCloseSidePanel: () => {} },
    });
    await nextTick();
    expect(fixture.querySelector(selectors.availableCurrencies)).toBe(null);
  });
});
