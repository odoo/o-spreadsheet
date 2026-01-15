import { Currency } from "@odoo/o-spreadsheet-engine/types/currency";
import { Model } from "../../src";
import { MoreFormatsPanel } from "../../src/components/side_panel/more_formats/more_formats";
import { currenciesRegistry } from "../../src/registries/currencies_registry";
import { updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { click, editSelectComponent, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import { getCell } from "../test_helpers/getters_helpers";
import {
  mountComponent,
  mountComponentWithPortalTarget,
  nextTick,
  spyModelDispatch,
} from "../test_helpers/helpers";

jest.useFakeTimers();

const selectors = {
  availableCurrencies: ".o-more-formats-panel .o-available-currencies",
  inputCode: ".o-more-formats-panel .o-subsection-left input",
  inputSymbol: ".o-more-formats-panel .o-subsection-right input",
  formatProposals: ".o-more-formats-panel .o-format-proposals",
  selectedProposal: ".o-more-formats-panel .o-format-proposals .active",
  formatProposalOptions: ".o-more-formats-panel .o-format-proposals > div",
  accountingFormatCheckbox: ".o-more-formats-panel input[name='accountingFormat']",
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
  const tableRows = fixture.querySelectorAll(".o-more-formats-panel table tr");
  return Array.from(tableRows).map((row) => row.children[1].textContent);
}

function getProposalValues() {
  const tableRows = fixture.querySelectorAll<HTMLElement>(selectors.formatProposalOptions);
  return Array.from(tableRows).map((row) => row.dataset.name);
}

async function selectProposalAtIndex(index: number) {
  await click(fixture, selectors.formatProposals + ` div:nth-child(${index + 1})`);
}

describe("custom currency sidePanel component", () => {
  beforeEach(async () => {
    currenciesContent = Object.assign({}, currenciesRegistry.content);

    ({ model, fixture } = await mountComponentWithPortalTarget(MoreFormatsPanel, {
      env: { loadCurrencies },
      model: new Model({}, { external: { loadCurrencies } }),
      props: { onCloseSidePanel: () => {}, category: "currency" },
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
      expect(selectors.inputCode).toHaveValue("");
      expect(selectors.inputSymbol).toHaveValue("");

      await editSelectComponent(selectors.availableCurrencies, "1");

      expect(selectors.inputCode).toHaveValue(code1);
      expect(selectors.inputSymbol).toHaveValue(symbol1);
    });

    test("select currency in available currencies selector --> changes currency proposals", async () => {
      await editSelectComponent(selectors.availableCurrencies, "1");
      expect(getProposalValues().every((v) => v?.includes(symbol1))).toBe(true);

      await editSelectComponent(selectors.availableCurrencies, "2");
      expect(getProposalValues().every((v) => v?.includes(symbol2))).toBe(true);
    });

    test("select currency in available currencies selector --> does not change proposal selected index", async () => {
      await editSelectComponent(selectors.availableCurrencies, "1");
      await selectProposalAtIndex(6);
      expect(selectors.selectedProposal).toHaveText(`${code1} ${symbol1}1,000`);

      await editSelectComponent(selectors.availableCurrencies, "2");
      expect(selectors.selectedProposal).toHaveText(`1,000 ${code2} ${symbol2}`); // first currency has symbol before, second has symbol after
    });

    test("select first currency (custom currency) in available currencies selector --> remove code input and symbol input", async () => {
      await editSelectComponent(selectors.availableCurrencies, "1");

      expect(selectors.inputCode).toHaveValue(code1);
      expect(selectors.inputSymbol).toHaveValue(symbol1);

      await editSelectComponent(selectors.availableCurrencies, "0");

      expect(selectors.inputCode).toHaveValue("");
      expect(selectors.inputSymbol).toHaveValue("");
    });

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> selected currency becomes custom currency",
      async (selector) => {
        await editSelectComponent(selectors.availableCurrencies, "1");
        expect(selectors.availableCurrencies).toHaveText(
          `${currenciesData[0].name} (${currenciesData[0].code})`
        );

        await setInputValueAndTrigger(selector, "test");
        expect(selectors.availableCurrencies).toHaveText("Custom");
      }
    );

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "change code input or symbol input --> change currency proposals",
      async (selector) => {
        await setInputValueAndTrigger(selectors.inputCode, "CODE");
        await setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL");
        expect(getProposalValues()).toMatchSnapshot();

        await setInputValueAndTrigger(selector, "TEST");
        expect(getProposalValues()).toMatchSnapshot();
      }
    );

    test("currency proposals uses locale format", async () => {
      await editSelectComponent(selectors.availableCurrencies, "1");
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
        await editSelectComponent(selectors.availableCurrencies, "1");
        await selectProposalAtIndex(6);
        expect(selectors.selectedProposal).toHaveText(`${code1} ${symbol1}1,000`);

        await setInputValueAndTrigger(selector, "TEST");
        const expectedPrefix =
          selector === selectors.inputCode ? `TEST ${symbol1}` : `${code1} TEST`;
        expect(selectors.selectedProposal).toHaveText(expectedPrefix + "1,000");
      }
    );

    test.each([selectors.inputCode, selectors.inputSymbol])(
      "have only one input filled --> display 4 proposals instead of 8",
      async (selector) => {
        await editSelectComponent(selectors.availableCurrencies, "1");
        expect(selectors.formatProposalOptions).toHaveCount(8);

        await setInputValueAndTrigger(selector, "  ");

        expect(selectors.formatProposalOptions).toHaveCount(4);
      }
    );

    // -------------------------------------------------------------------------
    // Currency proposals
    // -------------------------------------------------------------------------
    test.each([
      [0, "#,##0[$$]"],
      [1, "#,##0.00[$$]"],
      [2, "#,##0[$ USD $]"],
      [3, "#,##0.00[$ USD $]"],
      [4, "[$$]#,##0"],
      [5, "[$$]#,##0.00"],
      [6, "[$USD $]#,##0"],
      [7, "[$USD $]#,##0.00"],
    ])("format applied depends on selected proposal", async (proposalIndex, formatResult) => {
      await setInputValueAndTrigger(selectors.inputSymbol, "$");
      await setInputValueAndTrigger(selectors.inputCode, "USD");
      await selectProposalAtIndex(proposalIndex);
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
        [1, decimalPlacesRegex],
        [3, decimalPlacesRegex],
        [5, decimalPlacesRegex],
        [7, decimalPlacesRegex],
      ])(
        "odd currency proposals depend on decimal places property",
        async (concernedIndex, decimalPlacesRegexp) => {
          await editSelectComponent(selectors.availableCurrencies, availableCurrencyIndex);
          await selectProposalAtIndex(concernedIndex);
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
        [0, firstFourProposalsPositionRegex],
        [1, firstFourProposalsPositionRegex],
        [2, firstFourProposalsPositionRegex],
        [3, firstFourProposalsPositionRegex],
        [4, lastFourProposalsPositionRegex],
        [5, lastFourProposalsPositionRegex],
        [6, lastFourProposalsPositionRegex],
        [7, lastFourProposalsPositionRegex],
      ])(
        "currency proposals depend on position property",
        async (concernedIndex, positionExpressionRegexp) => {
          await editSelectComponent(selectors.availableCurrencies, availableCurrencyIndex);
          await selectProposalAtIndex(concernedIndex);
          expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
            sheetId: model.getters.getActiveSheetId(),
            target: model.getters.getSelectedZones(),
            format: expect.stringMatching(positionExpressionRegexp),
          });
        }
      );

      const twoDecimalPlacesRegex = /.0{2}/;

      test.each([[1], [3], [5], [7]])(
        "odd currency proposals have two decimal places when no available currency is selected",
        async (concernedIndex) => {
          await editSelectComponent(selectors.availableCurrencies, "0");
          await setInputValueAndTrigger(selectors.inputCode, "CODE");
          await setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL");
          await selectProposalAtIndex(concernedIndex);
          expect(dispatch).toHaveBeenCalledWith("SET_FORMATTING_WITH_PIVOT", {
            sheetId: model.getters.getActiveSheetId(),
            target: model.getters.getSelectedZones(),
            format: expect.stringMatching(twoDecimalPlacesRegex),
          });
        }
      );

      test.each([
        [0, afterPositionExpressionRegex],
        [1, afterPositionExpressionRegex],
        [2, afterPositionExpressionRegex],
        [3, afterPositionExpressionRegex],
        [4, beforePositionExpressionRegex],
        [5, beforePositionExpressionRegex],
        [6, beforePositionExpressionRegex],
        [7, beforePositionExpressionRegex],
      ])(
        "currency first four proposals start by expression placed after digits when no available currency is selected",
        async (concernedIndex, positionExpressionRegexp) => {
          await editSelectComponent(selectors.availableCurrencies, "0");
          await setInputValueAndTrigger(selectors.inputCode, "CODE");
          await setInputValueAndTrigger(selectors.inputSymbol, "SYMBOL");
          await selectProposalAtIndex(concernedIndex);
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
    expect(getExampleValues()).toEqual([" 1,235 €", "(1,235)€", "  -  €"]);
    expect(getCell(model, "A1")?.format).toBe(" #,##0 * [$€];(#,##0)* [$€];  -  * [$€]");
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
    await mountComponent(MoreFormatsPanel, {
      env: { loadCurrencies },
      model: new Model({}, { external: { loadCurrencies } }),
      props: { onCloseSidePanel: () => {}, category: "currency" },
    });
    await nextTick();
    expect(selectors.availableCurrencies).toHaveCount(1);
  });

  test("if currencies aren't provided in spreadsheet --> remove 'available currencies' section", async () => {
    await mountComponent(MoreFormatsPanel, {
      env: { loadCurrencies: undefined },
      model: new Model({}),
      props: { onCloseSidePanel: () => {}, category: "currency" },
    });
    await nextTick();
    expect(selectors.availableCurrencies).toHaveCount(0);
  });
});
