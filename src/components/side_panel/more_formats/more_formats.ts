import { onWillStart, useOnChange, useProps } from "@odoo/owl";
import { provideAndUsePlugin } from "../../../helpers/owl3_helpers";
import { currenciesRegistry } from "../../../registries/currencies_registry";
import { Currency } from "../../../types/currency";
import { ValueAndLabel } from "../../../types/misc";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";
import { Select } from "../../select/select";
import { TextInput } from "../../text_input/text_input";
import { BadgeSelection } from "../components/badge_selection/badge_selection";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";
import { MoreFormatsPlugin } from "./more_formats_owl_plugin";

export class MoreFormatsPanel extends OSComponent {
  static template = "o-spreadsheet-MoreFormatsPanel";
  static components = {
    BadgeSelection,
    Section,
    TextInput,
    Checkbox,
    Select,
  };

  protected props = useProps({
    onCloseSidePanel: types.function(),
    category: types
      .or([types.literal("number"), types.literal("date"), types.literal("currency")])
      .optional(),
  });

  plugin = provideAndUsePlugin(MoreFormatsPlugin, { category: this.props.category });

  setup() {
    onWillStart(() => this.loadCurrencies());
    useOnChange(
      () => [this.props.category],
      (category) => {
        if (category) {
          this.plugin.changeCategory(category);
        }
      }
    );
  }

  async loadCurrencies() {
    if (currenciesRegistry.getAll().length === 0) {
      const currencies = (await this.model().config.external.loadCurrencies?.()) ?? [];
      currencies.forEach((currency, index) => {
        currenciesRegistry.replace(index.toString(), currency);
      });
      this.plugin.updateAvailableCurrencies();
    }
  }

  currencyDisplayName(currency: Currency): string {
    return currency.name + (currency.code ? ` (${currency.code})` : "");
  }

  updateSelectCurrency(value: string) {
    const currencyIndex = parseInt(value, 10);
    this.plugin.selectCurrency(currencyIndex);
  }

  isFormatSelected(format: string | undefined): boolean {
    const currentFormat = this.plugin.currentFormat();
    return format === currentFormat;
  }

  get availableCurrenciesOptions(): ValueAndLabel[] {
    return this.plugin.availableCurrencies().map((currency, index) => ({
      value: index.toString(),
      label: this.currencyDisplayName(currency),
    }));
  }
}
