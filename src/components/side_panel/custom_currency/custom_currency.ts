import { Component, onWillStart, useState } from "@odoo/owl";
import { createCurrencyFormat, formatValue, roundFormat } from "../../../helpers";
import { currenciesRegistry } from "../../../registries/currencies_registry";
import { _t } from "../../../translation";
import { Currency, Format, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { CustomCurrencyTerms } from "../../translations_terms";
import { Section } from "../components/section/section";

css/* scss */ `
  .o-custom-currency {
    .o-format-proposals {
      color: black;
    }
  }
`;

interface CurrencyProposal {
  format: string;
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
}

export class CustomCurrencyPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CustomCurrencyPanel";
  static components = { Section };
  private availableCurrencies!: Currency[];
  private state!: State;

  setup() {
    this.availableCurrencies = [];
    this.state = useState({
      selectedCurrencyIndex: 0,
      currencyCode: "",
      currencySymbol: "",
      selectedFormatIndex: 0,
    });
    onWillStart(() => this.updateAvailableCurrencies());
  }

  get formatProposals(): CurrencyProposal[] {
    const currency = this.availableCurrencies[this.state.selectedCurrencyIndex];
    const position = currency.position;
    const opposite = currency.position === "before" ? "after" : "before";
    const symbol = this.state.currencySymbol.trim() ? this.state.currencySymbol : "";
    const code = this.state.currencyCode.trim() ? this.state.currencyCode : "";
    const decimalPlaces = currency.decimalPlaces;
    if (!symbol && !code) {
      return [];
    }
    const simple = symbol ? createCurrencyFormat({ symbol, position, decimalPlaces }) : "";
    const rounded = simple ? roundFormat(simple) : "";
    const simpleWithCode = createCurrencyFormat({ symbol, position, decimalPlaces, code });
    const roundedWithCode = roundFormat(simpleWithCode);
    const simpleOpposite = symbol
      ? createCurrencyFormat({ symbol, position: opposite, decimalPlaces })
      : "";
    const roundedOpposite = simpleOpposite ? roundFormat(simpleOpposite) : "";
    const simpleOppositeWithCode = createCurrencyFormat({
      symbol,
      position: opposite,
      decimalPlaces,
      code,
    });
    const roundedOppositeWithCode = roundFormat(simpleOppositeWithCode);
    const formats = new Set([
      rounded,
      simple,
      roundedWithCode,
      simpleWithCode,
      roundedOpposite,
      simpleOpposite,
      roundedOppositeWithCode,
      simpleOppositeWithCode,
    ]);
    return [...formats]
      .filter((format) => format !== "")
      .map((format) => ({
        format,
        example: formatValue(1000.0, { format, locale: this.env.model.getters.getLocale() }),
      }));
  }

  get isSameFormat(): boolean {
    const selectedFormat = this.formatProposals[this.state.selectedFormatIndex];
    return selectedFormat ? selectedFormat.format === this.getCommonFormat() : false;
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
    const selectedFormat = this.formatProposals[this.state.selectedFormatIndex];
    this.env.model.dispatch("SET_FORMATTING", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      target: this.env.model.getters.getSelectedZones(),
      format: selectedFormat.format,
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
}

CustomCurrencyPanel.props = {
  onCloseSidePanel: Function,
};
