import { Component, onWillStart } from "@odoo/owl";
import { GRAY_100, GRAY_300 } from "../../../constants";
import { DAYS, deepEquals, formatValue } from "../../../helpers";
import { getDateTimeFormat, isValidLocale } from "../../../helpers/locale";
import { EASING_FN, cellAnimationRegistry } from "../../../registries/cell_animation_registry";
import { Store, useStore } from "../../../store_engine";
import { GridRenderer } from "../../../stores/grid_renderer_store";
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
  gridRendererStore!: Store<GridRenderer>;

  // ADRM TODO: remove all of this once we remove animation dev tools in the panel
  easingFns = Object.keys(EASING_FN);
  labels = {
    linear: "Linear",
    easeInQuad: "Quadratic ease in",
    easeOutQuad: "Quadratic ease out",
    easeInOutQuad: "Quadratic ease in-out",
    easeInCubic: "Cubic ease in",
    easeOutCubic: "Cubic ease out",
    easeInOutCubic: "Cubic ease in-out",
    easeInQuart: "Quartic ease in",
    easeOutQuart: "Quartic ease out",
    easeInOutQuart: "Quartic ease in-out",
    easeInQuint: "Quintic ease in",
    easeOutQuint: "Quintic ease out",
    easeInOutQuint: "Quintic ease in-out",
    easeInSine: "Sine ease in",
    easeOutSine: "Sine ease out",
    easeInOutSine: "Sine ease in-out",
    easeInExpo: "Exponential ease in",
    easeOutExpo: "Exponential ease out",
    easeInOutExpo: "Exponential ease in-out",
    easeInCirc: "Circular ease in",
    easeOutCirc: "Circular ease out",
    easeInOutCirc: "Circular ease in-out",
    easeInElastic: "Elastic ease in",
    easeOutElastic: "Elastic ease out",
    easeInOutElastic: "Elastic ease in-out",
    easeInBack: "Back ease in",
    easeOutBack: "Back ease out",
    easeInOutBack: "Back ease in-out",
    easeInBounce: "Bounce ease in",
    easeOutBounce: "Bounce ease out",
    easeInOutBounce: "Bounce ease in-out",
  };
  animationLabels = {
    textFadeIn: "Cell Fade In",
    textFadeOut: "Cell Fade Out",
    textChange: "Cell Sliding",
    animatedDataBar: "Data Bar",
    animatedBackgroundColorChange: "Color Change (table/cf)",
    borderFadeIn: "Border Fade In",
    borderFadeOut: "Border Fade Out",
  };

  get animationsTypes() {
    return cellAnimationRegistry.getKeys();
  }

  getCurrentAnimationEasing(item) {
    return cellAnimationRegistry.get(item)?.easingFn;
  }

  setCurrentAnimationEasing(item, ev) {
    const easingFn = ev.target.value;
    const animation = cellAnimationRegistry.get(item);
    animation.easingFn = easingFn;
  }

  setup() {
    this.gridRendererStore = useStore(GridRenderer);
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
}
