import { Component, onWillStart, useState } from "@odoo/owl";
import {
  createAccountingFormat,
  createCurrencyFormat,
  formatValue,
  isDefined,
} from "../../../helpers";
import { currenciesRegistry } from "../../../registries/currencies_registry";
import { _t } from "../../../translation";
import { Currency, Format, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { CustomCurrencyTerms } from "../../translations_terms";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

css/* scss */ `
  .o-custom-currency {
    .o-format-proposals {
      color: black;
    }

    .o-format-examples {
      background: #f9fafb;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #d8dadd;
      color: #374151;
    }
  }
`;

interface CurrencyProposal {
  format: Format;
  accountingFormat: Format;
  example: string;
}

interface Props {
  onCloseSidePanel: () => void;
}

interface State {
  selectedCurrencyIndex: number;
  currencyCode: string;
  currencySymbol: string;
  selectedFormatIndex: number;
  isAccountingFormat: boolean;
}

export class CustomCurrencyPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CustomCurrencyPanel";
  static components = { Section, Checkbox };
  static props = { onCloseSidePanel: Function };

  private availableCurrencies!: Currency[];
  private state!: State;

  setup() {
    this.availableCurrencies = [];
    this.state = useState({
      selectedCurrencyIndex: 0,
      currencyCode: "",
      currencySymbol: "",
      selectedFormatIndex: 0,
      isAccountingFormat: false,
    });
    onWillStart(() => this.updateAvailableCurrencies());
  }

  get formatProposals(): CurrencyProposal[] {
    const baseCurrency = this.availableCurrencies[this.state.selectedCurrencyIndex];
    const position = baseCurrency.position;
    const opposite = baseCurrency.position === "before" ? "after" : "before";
    const symbol = this.state.currencySymbol.trim() ? this.state.currencySymbol : "";
    const code = this.state.currencyCode.trim() ? this.state.currencyCode : "";
    const decimalPlaces = baseCurrency.decimalPlaces;
    if (!symbol && !code) {
      return [];
    }

    const simple = { symbol, position, decimalPlaces };
    const rounded = { symbol, position, decimalPlaces: 0 };
    const simpleWithCode = { symbol, position, decimalPlaces, code };
    const roundedWithCode = { symbol, position, decimalPlaces: 0, code };
    const simpleOpposite = { symbol, position: opposite, decimalPlaces };
    const roundedOpposite = { symbol, position: opposite, decimalPlaces: 0 };
    const simpleOppositeWithCode = { symbol, position: opposite, decimalPlaces, code };
    const roundedOppositeWithCode = { symbol, position: opposite, decimalPlaces: 0, code };

    const currencies = [
      rounded,
      simple,
      roundedWithCode,
      simpleWithCode,
      roundedOpposite,
      simpleOpposite,
      roundedOppositeWithCode,
      simpleOppositeWithCode,
    ] as Partial<Currency>[];

    const usedFormats = new Set<string>();
    const locale = this.env.model.getters.getLocale();
    return currencies
      .map((currency) => {
        const format = createCurrencyFormat(currency);
        if ((!currency.symbol && !currency.code) || usedFormats.has(format)) {
          return undefined;
        }
        usedFormats.add(format);
        return {
          format,
          accountingFormat: createAccountingFormat(currency),
          example: formatValue(1000.0, { format, locale }),
        };
      })
      .filter(isDefined);
  }

  get isSameFormat(): boolean {
    return this.selectedFormat ? this.selectedFormat === this.getCommonFormat() : false;
  }

  async updateAvailableCurrencies() {
    if (currenciesRegistry.getAll().length === 0) {
      const currencies = (await this.env.loadCurrencies?.()) || [];
      currencies.forEach((currency, index) => {
        currenciesRegistry.add(index.toString(), currency);
      });
    }

    const emptyCurrency: Currency = {
      name: _t(CustomCurrencyTerms.Custom),
      code: "",
      symbol: "",
      decimalPlaces: 2,
      position: "after",
    };

    this.availableCurrencies = [emptyCurrency, ...currenciesRegistry.getAll()];
  }

  updateSelectCurrency(ev: InputEvent) {
    const target = ev.target as HTMLInputElement;
    this.state.selectedCurrencyIndex = parseInt(target.value, 10);
    const currency = this.availableCurrencies[this.state.selectedCurrencyIndex];
    this.state.currencyCode = currency.code;
    this.state.currencySymbol = currency.symbol;
  }

  updateCode(ev: InputEvent) {
    const target = ev.target as HTMLInputElement;
    this.state.currencyCode = target.value;
    this.initAvailableCurrencies();
  }

  updateSymbol(ev: InputEvent) {
    const target = ev.target as HTMLInputElement;
    this.state.currencySymbol = target.value;
    this.initAvailableCurrencies();
  }

  updateSelectFormat(ev: InputEvent) {
    const target = ev.target as HTMLInputElement;
    this.state.selectedFormatIndex = parseInt(target.value, 10);
  }

  apply() {
    this.env.model.dispatch("SET_FORMATTING_WITH_PIVOT", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      target: this.env.model.getters.getSelectedZones(),
      format: this.selectedFormat,
    });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private initAvailableCurrencies() {
    this.state.selectedCurrencyIndex = 0;
  }

  private getCommonFormat(): Format | undefined {
    const selectedZones = this.env.model.getters.getSelectedZones();
    const sheetId = this.env.model.getters.getActiveSheetId();

    const cells = selectedZones
      .map((zone) => this.env.model.getters.getEvaluatedCellsInZone(sheetId, zone))
      .flat();
    const firstFormat = cells[0].format;

    return cells.every((cell) => cell.format === firstFormat) ? firstFormat : undefined;
  }

  currencyDisplayName(currency: Currency): string {
    return currency.name + (currency.code ? ` (${currency.code})` : "");
  }

  toggleAccountingFormat() {
    this.state.isAccountingFormat = !this.state.isAccountingFormat;
  }

  getFormatExamples() {
    const format = this.selectedFormat;
    const locale = this.env.model.getters.getLocale();
    return [
      { label: _t("positive") + ":", value: formatValue(1234.56, { format, locale }) },
      { label: _t("negative") + ":", value: formatValue(-1234.56, { format, locale }) },
      { label: _t("zero") + ":", value: formatValue(0, { format, locale }) },
    ];
  }

  get selectedFormat() {
    const proposal = this.formatProposals[this.state.selectedFormatIndex];
    return this.state.isAccountingFormat ? proposal?.accountingFormat : proposal?.format;
  }
}
