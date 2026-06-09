import { onWillStart, onWillUpdateProps, props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { currenciesRegistry } from "../../../registries/currencies_registry";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { Currency } from "../../../types/currency";
import { ValueAndLabel } from "../../../types/misc";
import { PropsOf } from "../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { types } from "../../props_validation";
import { Select } from "../../select/select";
import { TextInput } from "../../text_input/text_input";
import { BadgeSelection } from "../components/badge_selection/badge_selection";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";
import { MoreFormatsStore } from "./more_formats_store";

export class MoreFormatsPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-MoreFormatsPanel";
  static components = {
    BadgeSelection,
    Section,
    TextInput,
    Checkbox,
    Select,
  };

  protected props = props({
    onCloseSidePanel: types.function(),
    "category?": types.or([
      types.literal("number"),
      types.literal("date"),
      types.literal("currency"),
    ]),
  });

  store!: Store<MoreFormatsStore>;

  setup() {
    this.store = useLocalStore(MoreFormatsStore, this.props.category);
    onWillStart(() => this.loadCurrencies());
    onWillUpdateProps((nextProps: PropsOf<MoreFormatsPanel>) => {
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
