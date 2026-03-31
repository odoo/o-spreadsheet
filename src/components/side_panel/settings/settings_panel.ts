import { Component, onWillStart } from "@odoo/owl";
import { DAYS, deepEquals, formatValue } from "../../../helpers";
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { getDateTimeFormat, isValidLocale } from "../../../helpers/locale";
import { Locale, LocaleCode, ValueAndLabel } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Select } from "../../select/select";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
import { Locale, LocaleCode } from "../../../types";
=======
import { getDateTimeFormat, isValidLocale } from "../../../helpers/locale";
import { Locale, LocaleCode } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { BadgeSelection } from "../components/badge_selection/badge_selection";
import { Section } from "../components/section/section";

interface Props {
  onCloseSidePanel: () => void;
}

export class SettingsPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SettingsPanel";
  static components = { Section, ValidationMessages, BadgeSelection, Select };
  static props = { onCloseSidePanel: Function };

  loadedLocales: Locale[] = [];

  setup() {
    onWillStart(() => this.loadLocales());
  }

  onLocaleChange(code: LocaleCode) {
    const locale = this.loadedLocales.find((l) => l.code === code);
    if (!locale) {
      return;
    }
    this.env.model.dispatch("UPDATE_LOCALE", { locale });
  }

  private async loadLocales() {
    this.loadedLocales = (await this.env.loadLocales())
      .filter((locale) => {
        const isValid = isValidLocale(locale);
        if (!isValid) {
          console.warn(`Invalid locale: ${locale["code"]} ${locale}`);
        }
        return isValid;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get numberFormatPreview() {
    const locale = this.env.model.getters.getLocale();
    return formatValue(1234567.89, { format: "#,##0.00", locale });
  }

  get dateFormatPreview() {
    const locale = this.env.model.getters.getLocale();
    return formatValue(1.6, { format: locale.dateFormat, locale });
  }

  get dateTimeFormatPreview() {
    const locale = this.env.model.getters.getLocale();
    const dateTimeFormat = getDateTimeFormat(locale);
    return formatValue(1.6, { format: dateTimeFormat, locale });
  }

  get firstDayOfWeek() {
    const locale = this.env.model.getters.getLocale();
    const weekStart = locale.weekStart;
    // Week start: 1 = Monday, 7 = Sunday
    // Days: 0 = Sunday, 6 = Saturday
    return DAYS[weekStart % 7];
  }

  get currentLocale() {
    return this.env.model.getters.getLocale();
  }

  get supportedLocales() {
    const currentLocale = this.currentLocale;
    const localeInLoadedLocales = this.loadedLocales.find((l) => l.code === currentLocale.code);

    if (!localeInLoadedLocales) {
      return [...this.loadedLocales, currentLocale].sort((a, b) => a.name.localeCompare(b.name));
    } else if (!deepEquals(currentLocale, localeInLoadedLocales)) {
      const index = this.loadedLocales.indexOf(localeInLoadedLocales);
      const locales = [...this.loadedLocales];
      locales[index] = currentLocale;
      locales.sort((a, b) => a.name.localeCompare(b.name));
      return locales;
    }

    return this.loadedLocales;
  }

  get selectOptions(): ValueAndLabel[] {
    return this.supportedLocales.map((locale) => ({ label: locale.name, value: locale.code }));
  }
}
