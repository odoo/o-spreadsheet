import { ValueAndLabel } from "@odoo/o-spreadsheet-engine";
import { Currency } from "@odoo/o-spreadsheet-engine/types/currency";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Store } from "@odoo/o-spreadsheet-engine/types/store_engine";
import { Component, onWillStart, onWillUpdateProps } from "@odoo/owl";
import { currenciesRegistry } from "../../../registries/currencies_registry";
import { useLocalStore } from "../../../store_engine";
import { Select } from "../../select/select";
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
