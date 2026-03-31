import { Component, onWillStart, onWillUpdateProps } from "@odoo/owl";
import { currenciesRegistry } from "../../../registries/currencies_registry";
import { useLocalStore } from "../../../store_engine";
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { ValueAndLabel } from "../../../types";
import { Currency } from "../../../types/currency";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { Select } from "../../select/select";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
=======
import { Currency } from "../../../types/currency";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import { TextInput } from "../../text_input/text_input";
import { BadgeSelection } from "../components/badge_selection/badge_selection";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";
import { CustomFormatCategory, MoreFormatsStore } from "./more_formats_store";

interface Props {
  onCloseSidePanel: () => void;
  category?: CustomFormatCategory;
}

export class MoreFormatsPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-MoreFormatsPanel";
  static props = {
    onCloseSidePanel: Function,
    category: { type: String, optional: true },
  };
  static components = {
    BadgeSelection,
    Section,
    TextInput,
    Checkbox,
    Select,
  };

  store!: Store<MoreFormatsStore>;

  setup() {
    this.store = useLocalStore(MoreFormatsStore, this.props.category);
    onWillStart(() => this.loadCurrencies());
    onWillUpdateProps((nextProps: Props) => {
      if (nextProps.category && nextProps.category !== this.props.category) {
        this.store.changeCategory(nextProps.category);
      }
    });
  }

  async loadCurrencies() {
    if (currenciesRegistry.getAll().length === 0) {
      const currencies = await (this.env.loadCurrencies?.() ?? Promise.resolve([]));
      currencies.forEach((currency, index) => {
        currenciesRegistry.replace(index.toString(), currency);
      });
      this.store.updateAvailableCurrencies();
    }
  }

  currencyDisplayName(currency: Currency): string {
    return currency.name + (currency.code ? ` (${currency.code})` : "");
  }

  updateSelectCurrency(value: string) {
    const currencyIndex = parseInt(value, 10);
    this.store.selectCurrency(currencyIndex);
  }

  isFormatSelected(format: string | undefined): boolean {
    const currentFormat = this.store.currentFormat;
    return format === currentFormat;
  }

  get availableCurrenciesOptions(): ValueAndLabel[] {
    return this.store.availableCurrencies.map((currency, index) => ({
      value: index.toString(),
      label: this.currencyDisplayName(currency),
    }));
  }
}
