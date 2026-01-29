import { _t, Format, isDefined } from "@odoo/o-spreadsheet-engine";
import { CustomCurrencyTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { Currency } from "@odoo/o-spreadsheet-engine/types/currency";
import { Get } from "@odoo/o-spreadsheet-engine/types/store_engine";
import { EXAMPLE_DATE } from "../../../actions/format_actions";
import {
  createAccountingFormat,
  createCurrencyFormat,
  formatValue,
  getNumberOfFormatParts,
  isDateTimeFormat,
  isFormatValid,
} from "../../../helpers";
import { currenciesRegistry } from "../../../registries/currencies_registry";
import { SpreadsheetStore } from "../../../stores";

export type CustomFormatCategory = "number" | "date" | "currency";

const CUSTOM_CURRENCY: Currency = {
  name: CustomCurrencyTerms.Custom,
  code: "",
  symbol: "",
  decimalPlaces: 2,
  position: "after",
};

export class MoreFormatsStore extends SpreadsheetStore {
  mutators = [
    "updateFormat",
    "changeCategory",
    "selectCurrency",
    "changeCurrencyCode",
    "changeCurrencySymbol",
    "updateAvailableCurrencies",
  ] as const;

  invalidFormat = false;
  isApplyingFormatFromPanel = false;
  currentFormat = this.formatInSelection;
  category: CustomFormatCategory = this.detectFormatCategory(this.formatInSelection);

  selectedCurrencyIndex = 0;
  currencyCode = "";
  currencySymbol = "";
  isAccountingFormat = false;
  availableCurrencies: Currency[] = [CUSTOM_CURRENCY, ...currenciesRegistry.getAll()];

  private lastFormatInSelection = this.currentFormat;
  private usedFormatForCategory: Partial<Record<CustomFormatCategory, Format | undefined>> = {};

  constructor(get: Get, category?: CustomFormatCategory) {
    super(get);
    if (category) {
      this.category = category;
    }
    this.model.selection.observe(this, {
      handleEvent: this.handleSelectionEvent.bind(this),
    });
    this.onDispose(() => {
      this.model.selection.unobserve(this);
    });
  }

  handle() {
    if (!this.isApplyingFormatFromPanel) {
      this.syncActiveFormat();
    }
  }

  handleSelectionEvent() {
    if (this.getters.isGridSelectionActive()) {
      this.syncActiveFormat();
    }
  }

  private syncActiveFormat() {
    const selectedFormat = this.formatInSelection;
    if (selectedFormat !== this.lastFormatInSelection) {
      this.setActiveFormat(selectedFormat);
      this.lastFormatInSelection = selectedFormat;
    }
  }

  private setActiveFormat(format: Format | undefined) {
    this.currentFormat = format;
    this.invalidFormat = !isFormatValid(format || "");
    this.category = this.detectFormatCategory(format);
  }

  get categories(): { label: string; value: CustomFormatCategory }[] {
    return [
      { label: _t("Number"), value: "number" },
      { label: _t("Date"), value: "date" },
      { label: _t("Currency"), value: "currency" },
    ];
  }

  get formatInSelection() {
    const activePosition = this.getters.getActivePosition();
    const pivotCell = this.getters.getPivotCellFromPosition(activePosition);
    if (pivotCell.type === "VALUE") {
      return this.getters.getEvaluatedCell(activePosition).format;
    }
    return this.getters.getCell(activePosition)?.format;
  }

  private detectFormatCategory(format: Format | undefined): CustomFormatCategory {
    if (!format) {
      return "number";
    }
    if (isDateTimeFormat(format)) {
      return "date";
    }

    // Simple heuristic, if there's escape sequences it's probably a currency
    return format.includes("$") || format.includes('"') ? "currency" : "number";
  }

  get formatProposals() {
    if (this.category === "date") {
      return this.dateFormatProposals;
    } else if (this.category === "currency") {
      return this.currencyFormatProposals;
    } else if (this.category === "number") {
      return this.numberFormatProposals;
    }
    return [];
  }

  get numberFormatProposals() {
    const numberFormats = [
      "0.00",
      "0",
      "#,##0",
      "#,##0.00",
      "0%",
      "0.00%",
      "0.00e",
      "0.00;(0.00);-",
    ].map((format) => ({
      label: formatValue(-1234.56, { format, locale: this.getters.getLocale() }),
      format,
    }));

    return [
      { label: _t("Automatic"), format: undefined },
      { label: _t("Plain text"), format: "@" },
      ...numberFormats,
    ];
  }

  get dateFormatProposals() {
    const locale = this.getters.getLocale();
    const formats = [
      locale.dateFormat,
      locale.timeFormat,
      locale.dateFormat + " " + locale.timeFormat,
      "dddd d mmmm yyyy hh:mm:ss a",
      "yyyy-mm-dd",
      "yyyy-mm-dd hh:mm:ss",
      "dddd d mmmm yyyy",
      "d mmmm yyyy",
      "ddd d mmm yyyy",
      "d mmm yyyy",
      "mmmm yyyy",
      "mmm yyyy",
      "hhhh:mm:ss",
      "qq yyyy",
      "qqqq yyyy",
    ];
    return formats.map((format) => ({
      label: formatValue(EXAMPLE_DATE, { format, locale }),
      format,
    }));
  }

  get currencyFormatProposals() {
    const baseCurrency = this.availableCurrencies[this.selectedCurrencyIndex];
    const position = baseCurrency.position;
    const opposite = baseCurrency.position === "before" ? "after" : "before";
    const symbol = this.currencySymbol.trim() ? this.currencySymbol : "";
    const code = this.currencyCode.trim() ? this.currencyCode : "";
    const decimalPlaces = baseCurrency.decimalPlaces;
    if (!symbol && !code) {
      return [];
    }

    const simple = { symbol, position, decimalPlaces };
    const rounded = { symbol, position, decimalPlaces: 0 };
    const simpleWithCode = { symbol, position, decimalPlaces, code };
    const roundedWithCode = { symbol, position, decimalPlaces: 0, code };
    const simpleOpposite = { symbol, position: opposite, decimalPlaces };
    const roundedOpposite = { symbol, position: opposite, decimalPlaces: 0 };
    const simpleOppositeWithCode = { symbol, position: opposite, decimalPlaces, code };
    const roundedOppositeWithCode = { symbol, position: opposite, decimalPlaces: 0, code };

    const currencies = [
      rounded,
      simple,
      roundedWithCode,
      simpleWithCode,
      roundedOpposite,
      simpleOpposite,
      roundedOppositeWithCode,
      simpleOppositeWithCode,
    ] as Partial<Currency>[];

    const usedFormats = new Set<string>();
    const locale = this.getters.getLocale();
    return currencies
      .map((currency) => {
        const format = this.isAccountingFormat
          ? createAccountingFormat(currency)
          : createCurrencyFormat(currency);
        if ((!currency.symbol && !currency.code) || usedFormats.has(format)) {
          return undefined;
        }
        usedFormats.add(format);
        return {
          format,
          label: formatValue(1000.0, { format, locale }),
        };
      })
      .filter(isDefined);
  }

  get formatExamples() {
    const format = this.currentFormat;
    const locale = this.getters.getLocale();
    if (!format || !isFormatValid(format)) {
      return [];
    }
    if (this.category === "date") {
      return [{ label: _t("Sample:"), value: formatValue(EXAMPLE_DATE, { format, locale }) }];
    } else {
      const numberOfParts = getNumberOfFormatParts(format);
      const parts = [
        { label: _t("Positive:"), value: formatValue(1234.56, { format, locale }) },
        { label: _t("Negative:"), value: formatValue(-1234.56, { format, locale }) },
        { label: _t("Zero:"), value: formatValue(0, { format, locale }) },
      ];
      if (numberOfParts === 4) {
        parts.push({ label: _t("Text:"), value: formatValue("Text", { format, locale }) });
      }
      return parts;
    }
  }

  updateAvailableCurrencies() {
    this.availableCurrencies = [CUSTOM_CURRENCY, ...currenciesRegistry.getAll()];
  }

  updateFormat(format: string) {
    this.currentFormat = format;
    this.invalidFormat = !isFormatValid(format);

    if (!this.invalidFormat) {
      this.lastFormatInSelection = format;
      this.isApplyingFormatFromPanel = true;
      this.model.dispatch("SET_FORMATTING_WITH_PIVOT", {
        sheetId: this.getters.getActiveSheetId(),
        target: this.getters.getSelectedZones(),
        format: format || "",
      });
      this.isApplyingFormatFromPanel = false;
    }
  }

  changeCategory(category: CustomFormatCategory) {
    if (category === this.category) {
      return "noStateChange";
    }
    this.usedFormatForCategory[this.category] = this.currentFormat;
    this.category = category;
    const format = this.usedFormatForCategory[category] || this.formatProposals[0]?.format || "";
    this.updateFormat(format);
    return;
  }

  selectCurrency(index: number) {
    const proposalIndex = this.formatProposals.findIndex((p) => p.format === this.currentFormat);
    this.selectedCurrencyIndex = index;
    const currency = this.availableCurrencies[index];
    this.currencyCode = currency.code;
    this.currencySymbol = currency.symbol;
    this.updateFormat(
      this.formatProposals[proposalIndex]?.format || this.formatProposals[0]?.format || ""
    );
  }

  changeCurrencyCode(code: string) {
    const proposalIndex = this.formatProposals.findIndex((p) => p.format === this.currentFormat);
    this.currencyCode = code;
    this.selectedCurrencyIndex = 0; // custom currency
    this.updateFormat(
      this.formatProposals[proposalIndex]?.format || this.formatProposals[0]?.format || ""
    );
  }

  changeCurrencySymbol(symbol: string) {
    const proposalIndex = this.formatProposals.findIndex((p) => p.format === this.currentFormat);
    this.currencySymbol = symbol;
    this.selectedCurrencyIndex = 0; // custom currency
    this.updateFormat(
      this.formatProposals[proposalIndex]?.format || this.formatProposals[0]?.format || ""
    );
  }

  toggleAccountingFormat() {
    const proposalIndex = this.formatProposals.findIndex((p) => p.format === this.currentFormat);
    this.isAccountingFormat = !this.isAccountingFormat;
    this.updateFormat(
      this.formatProposals[proposalIndex]?.format || this.formatProposals[0]?.format || ""
    );
  }

  get invalidFormatMessage(): string | undefined {
    return this.invalidFormat ? _t("The format entered is not valid.") : undefined;
  }
}
