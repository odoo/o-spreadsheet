import * as owl from "@odoo/owl";
import { currenciesRegistry, Currency } from "../../registries/currencies_registry";
import { SpreadsheetEnv } from "../../types/index";
import { CustomCurrencyTerms } from "./translations_terms";

const { Component, tags, useState } = owl;
const { xml, css } = tags;
const { onMounted } = owl.hooks;

const TEMPLATE = xml/* xml */ `
<div class="o-custom-currency">

    <div class="o-section" t-if="currencies.length > 1">
        <div class="o-section-title" t-esc="env._t('${CustomCurrencyTerms.Search}')"/>
        <select class="o-input" t-on-change="updateSelectCurrency()">
            <t t-foreach="currencies" t-as="currency" t-key="currency_index">
                <option
                  t-att-value="currency_index"
                  t-esc="currency.name"
                  t-att-selected="currency_index === state.selectedCurrencyIndex"
                />
            </t>
        </select>
    </div>

    <div class="o-section">
        <div class="o-section-title" t-esc="env._t('${CustomCurrencyTerms.Custom}')"/>

        <div class="o-subsection-left">
            <div class="o-section-subtitle" t-esc="env._t('${CustomCurrencyTerms.Symbol}')"/>
            <input
              type="text"
              class="o-input"
              t-model="state.currencySymbol"
              t-on-input="updateSymbol()"
            />
        </div>
        <div class="o-subsection-right">
            <div class="o-section-subtitle" t-esc="env._t('${CustomCurrencyTerms.Code}')"/>
            <input
              type="text"
              class="o-input"
              t-model="state.currencyCode"
              t-on-input="updateCode()"
            />
        </div>
    </div>

    <div class="o-section">
        <div class="o-subsection-left">
          <select
            class="o-input o-currency-proposal"
            t-on-change="updateSelectFormat()"
            t-att-disabled="!state.currenciesProposal.length"
          >
              <t t-foreach="state.currenciesProposal" t-as="proposal" t-key="proposal_index">
                  <option t-att-value="proposal_index" t-esc="proposal.example"/>
              </t>
          </select>
        </div>

        <div class="o-subsection-right">
            <button
              class="o-sidePanelButton"
              t-on-click="apply"
              t-esc="env._t('${CustomCurrencyTerms.Apply}')"
              t-att-disabled="!state.currenciesProposal.length"
            />
        </div>
    </div>

</div>
`;

const CSS = css/* scss */ `
  .o-custom-currency {
    .o-currency-proposal {
      color: black;
    }
  }
`;

interface Props {
  currencies?: any;
}

interface CurrencyProposal {
  format: string;
  example: string;
}

interface State {
  selectedCurrencyIndex: number;
  currencyCode: string;
  currencySymbol: string;
  currenciesProposal: CurrencyProposal[];
}

const emptyCurrency: Currency = {
  name: "",
  code: "",
  symbol: "",
  decimalPlaces: 2,
  position: "after",
};
export class CustomCurrencyPanel extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  getters = this.env.getters;

  private currencies: Currency[] = [emptyCurrency, ...currenciesRegistry.getAll()];
  private position: Currency["position"] = "after";
  private decimalPlaces: Currency["decimalPlaces"] = 2;
  private selectedFormatIndex = 0;

  private state: State = useState({
    selectedCurrencyIndex: 0,
    currencyCode: "",
    currencySymbol: "",
    currenciesProposal: [],
  });

  setup() {
    onMounted(() => this.updateCurrenciesProposal());
  }

  updateSelectCurrency(ev) {
    this.state.selectedCurrencyIndex = ev.target.value;
    const currency = this.currencies[this.state.selectedCurrencyIndex];
    this.state.currencyCode = currency.code;
    this.state.currencySymbol = currency.symbol;
    this.position = currency.position;
    this.decimalPlaces = currency.decimalPlaces;
    this.updateCurrenciesProposal();
  }

  updateCode(ev) {
    this.state.currencyCode = ev.target.value;
    this.initCurrenciesSearch();
    this.updateCurrenciesProposal();
  }

  updateSymbol(ev) {
    this.state.currencySymbol = ev.target.value;
    this.initCurrenciesSearch();
    this.updateCurrenciesProposal();
  }

  updateSelectFormat(ev) {
    this.selectedFormatIndex = ev.target.value;
  }

  apply() {
    const selectedCurrency = this.state.currenciesProposal[this.selectedFormatIndex];
    this.env.dispatch("SET_FORMATTING", {
      sheetId: this.env.getters.getActiveSheetId(),
      target: this.env.getters.getSelectedZones(),
      format: selectedCurrency.format,
    });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private initCurrenciesSearch() {
    this.state.selectedCurrencyIndex = 0;
  }

  private updateCurrenciesProposal() {
    const proposalBases = this.initProposalBases(this.decimalPlaces);
    const firstPosition = this.position === "before" ? "before" : "after";
    const secondPosition = this.position === "before" ? "after" : "before";
    const symbol = this.state.currencySymbol.trim() ? this.state.currencySymbol : "";
    const code = this.state.currencyCode.trim() ? this.state.currencyCode : "";

    this.state.currenciesProposal =
      code || symbol
        ? [
            ...this._updateCurrenciesProposal(proposalBases, symbol, code, firstPosition),
            ...this._updateCurrenciesProposal(proposalBases, symbol, code, secondPosition),
          ]
        : [];
  }

  private initProposalBases(decimalPlaces: Currency["decimalPlaces"]): CurrencyProposal[] {
    const decimalRepresentation = decimalPlaces ? "." + Array(decimalPlaces + 1).join("0") : "";
    return [
      { format: "#,##0", example: "1,000" },
      { format: "#,##0" + decimalRepresentation, example: "1,000" + decimalRepresentation },
    ];
  }

  private _updateCurrenciesProposal(
    proposalBases: CurrencyProposal[],
    symbol: Currency["symbol"],
    code: Currency["code"],
    position: Currency["position"]
  ): CurrencyProposal[] {
    let currenciesProposal: CurrencyProposal[] = [];

    // 1 - add proposal with symbol and without code
    if (symbol) {
      for (let base of proposalBases) {
        currenciesProposal.push(
          this.createCurrencyProposal(position, base.example, base.format, symbol)
        );
      }
    }

    // 2 - if code exist --> add more proposal with symbol and with code
    if (code) {
      for (let base of proposalBases) {
        const expression = (position === "after" ? " " : "") + code + " " + symbol;
        currenciesProposal.push(
          this.createCurrencyProposal(position, base.example, base.format, expression)
        );
      }
    }

    return currenciesProposal;
  }

  private createCurrencyProposal(
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
}
