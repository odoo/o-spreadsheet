import { Component, onWillStart, useState, xml } from "@odoo/owl";
import { currenciesRegistry } from "../../registries/currencies_registry";
import { Currency, Format, SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers/css";
import { CustomCurrencyTerms } from "../translations_terms";

const TEMPLATE = xml/* xml */ `
<div class="o-custom-currency">
    <div class="o-section" t-if="availableCurrencies.length > 1">
        <div class="o-section-title" t-esc="env._t('${CustomCurrencyTerms.Currency}')"/>
        <select class="o-input o-available-currencies" t-on-change="(ev) => this.updateSelectCurrency(ev)">
            <t t-foreach="availableCurrencies" t-as="currency" t-key="currency_index">
                <option
                  t-att-value="currency_index"
                  t-esc="currencyDisplayName(currency)"
                  t-att-selected="currency_index === state.selectedCurrencyIndex"
                />
            </t>
        </select>
    </div>
    <div class="o-section">
        <div class="o-subsection-left">
            <div class="o-section-title" t-esc="env._t('${CustomCurrencyTerms.Code}')"/>
            <input
              type="text"
              class="o-input"
              t-model="state.currencyCode"
              t-on-input="(ev) => this.updateCode(ev)"
            />
        </div>
        <div class="o-subsection-right">
            <div class="o-section-title" t-esc="env._t('${CustomCurrencyTerms.Symbol}')"/>
            <input
              type="text"
              class="o-input"
              t-model="state.currencySymbol"
              t-on-input="(ev) => this.updateSymbol(ev)"
            />
        </div>
    </div>
    <div class="o-section">
        <div class="o-section-title" t-esc="env._t('${CustomCurrencyTerms.Format}')"/>
        <select
          class="o-input o-format-proposals"
          t-on-change="(ev) => this.updateSelectFormat(ev)"
          t-att-disabled="!formatProposals.length"
        >
            <t t-foreach="formatProposals" t-as="proposal" t-key="proposal_index">
                <option
                  t-att-value="proposal_index"
                  t-esc="proposal.example"
                  t-att-selected="proposal_index === state.selectedFormatIndex"
                />
            </t>
        </select>
    </div>
    <div class="o-sidePanelButtons">
        <button
          class="o-sidePanelButton"
          t-on-click="() => this.apply()"
          t-esc="env._t('${CustomCurrencyTerms.Apply}')"
          t-att-disabled="!formatProposals.length || isSameFormat"
        />
    </div>
</div>
`;

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

interface State {
  selectedCurrencyIndex: number;
  currencyCode: string;
  currencySymbol: string;
  selectedFormatIndex: number;
}

export class CustomCurrencyPanel extends Component<any, SpreadsheetChildEnv> {
  static template = TEMPLATE;

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
    const proposalBases = this.initProposalBases(currency.decimalPlaces);
    const firstPosition = currency.position;
    const secondPosition = currency.position === "before" ? "after" : "before";
    const symbol = this.state.currencySymbol.trim() ? this.state.currencySymbol : "";
    const code = this.state.currencyCode.trim() ? this.state.currencyCode : "";

    return code || symbol
      ? [
          ...this.createFormatProposals(proposalBases, symbol, code, firstPosition),
          ...this.createFormatProposals(proposalBases, symbol, code, secondPosition),
        ]
      : [];
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
      name: this.env._t(CustomCurrencyTerms.Custom),
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

  private initProposalBases(decimalPlaces: Currency["decimalPlaces"]): CurrencyProposal[] {
    const result: CurrencyProposal[] = [{ format: "#,##0", example: "1,000" }];
    const decimalRepresentation = decimalPlaces ? "." + "0".repeat(decimalPlaces) : "";
    if (decimalRepresentation) {
      result.push({
        format: "#,##0" + decimalRepresentation,
        example: "1,000" + decimalRepresentation,
      });
    }
    return result;
  }

  private createFormatProposals(
    proposalBases: CurrencyProposal[],
    symbol: Currency["symbol"],
    code: Currency["code"],
    position: Currency["position"]
  ): CurrencyProposal[] {
    let formatProposals: CurrencyProposal[] = [];

    // 1 - add proposal with symbol and without code
    if (symbol) {
      for (let base of proposalBases) {
        formatProposals.push(
          this.createFormatProposal(position, base.example, base.format, symbol)
        );
      }
    }

    // 2 - if code exist --> add more proposal with symbol and with code
    if (code) {
      for (let base of proposalBases) {
        const expression = (position === "after" ? " " : "") + code + " " + symbol;
        formatProposals.push(
          this.createFormatProposal(position, base.example, base.format, expression)
        );
      }
    }

    return formatProposals;
  }

  private createFormatProposal(
    position: Currency["position"],
    baseExample: CurrencyProposal["example"],
    formatBase: CurrencyProposal["format"],
    expression: string
  ): CurrencyProposal {
    const formatExpression = "[$" + expression + "]";
    return {
      example: position === "before" ? expression + baseExample : baseExample + expression,
      format: position === "before" ? formatExpression + formatBase : formatBase + formatExpression,
    };
  }

  private getCommonFormat(): Format | undefined {
    const selectedZones = this.env.model.getters.getSelectedZones();
    const sheetId = this.env.model.getters.getActiveSheetId();

    const cells = selectedZones
      .map((zone) => this.env.model.getters.getCellsInZone(sheetId, zone))
      .flat();
    const firstFormat = cells[0]?.format;

    return cells.every((cell) => cell?.format === firstFormat) ? firstFormat : undefined;
  }

  currencyDisplayName(currency: Currency): string {
    return currency.name + (currency.code ? ` (${currency.code})` : "");
  }
}
