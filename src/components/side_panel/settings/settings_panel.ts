import { Component, onWillStart } from "@odoo/owl";
import { GRAY_100, GRAY_300 } from "../../../constants";
import { deepEquals, formatValue } from "../../../helpers";
import { getDateTimeFormat, isValidLocale } from "../../../helpers/locale";
import { Locale, LocaleCode, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Section } from "../components/section/section";

interface Props {
  onCloseSidePanel: () => void;
}

css/* scss */ `
  .o-locale-preview {
    border: 1px solid ${GRAY_300};
    background-color: ${GRAY_100};
  }
`;

export class SettingsPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SettingsPanel";
  static components = { Section, ValidationMessages };
  static props = { onCloseSidePanel: Function };

  loadedLocales: Locale[] = [];

  setup() {
    onWillStart(() => this.loadLocales());
  }

  onLocaleChange(code: LocaleCode) {
    const locale = this.loadedLocales.find((l) => l.code === code);
    if (!locale) return;
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

  get currentLocale() {
    return this.env.model.getters.getLocale();
  }

  get supportedLocales() {
    const currentLocale = this.currentLocale;
    const localeInLoadedLocales = this.loadedLocales.find((l) => l.code === currentLocale.code);

    if (!localeInLoadedLocales) {
      const locales = [...this.loadedLocales, currentLocale].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      return locales;
    } else if (!deepEquals(currentLocale, localeInLoadedLocales)) {
      const index = this.loadedLocales.indexOf(localeInLoadedLocales);
      const locales = [...this.loadedLocales];
      locales[index] = currentLocale;
      locales.sort((a, b) => a.name.localeCompare(b.name));
      return locales;
    }

    return this.loadedLocales;
  }
}
