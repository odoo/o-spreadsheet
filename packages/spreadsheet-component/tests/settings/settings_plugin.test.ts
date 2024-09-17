import { CommandResult, Model } from "../../src";
import { getDateTimeFormat } from "../../src/helpers/locale";
import { DEFAULT_LOCALE, Locale } from "../../src/types/locale";
import {
  redo,
  setCellContent,
  setFormat,
  undo,
  updateLocale,
} from "../test_helpers/commands_helpers";
import { CUSTOM_LOCALE, FR_LOCALE } from "../test_helpers/constants";
import { getCell, getCellContent } from "../test_helpers/getters_helpers";

describe("Settings plugin", () => {
  let model: Model;

  beforeEach(() => {
    model = new Model();
  });

  describe("Locale", () => {
    test("Can set the locale", () => {
      updateLocale(model, CUSTOM_LOCALE);
      expect(model.getters.getLocale()).toEqual(CUSTOM_LOCALE);
    });

    test("Cannot set invalid locale", () => {
      let result = updateLocale(model, { ...CUSTOM_LOCALE, dateFormat: "💀" });
      expect(result).toBeCancelledBecause(CommandResult.InvalidLocale);

      result = updateLocale(model, { ...CUSTOM_LOCALE, timeFormat: "💀" });
      expect(result).toBeCancelledBecause(CommandResult.InvalidLocale);

      result = updateLocale(model, {} as Locale);
      expect(result).toBeCancelledBecause(CommandResult.InvalidLocale);
    });

    test("Can undo/redo change in locale", () => {
      updateLocale(model, CUSTOM_LOCALE);
      undo(model);
      expect(model.getters.getLocale()).toEqual(DEFAULT_LOCALE);
      redo(model);
      expect(model.getters.getLocale()).toEqual(CUSTOM_LOCALE);
    });

    test("Can import/export locale", () => {
      updateLocale(model, CUSTOM_LOCALE);
      const exported = model.exportData();
      expect(exported.settings.locale).toEqual(CUSTOM_LOCALE);

      const newModel = new Model(exported);
      expect(newModel.getters.getLocale()).toEqual(CUSTOM_LOCALE);
    });

    test("Can import data with locale set", () => {
      const model = new Model({ settings: { locale: FR_LOCALE } });
      expect(model.getters.getLocale()).toEqual(FR_LOCALE);
    });

    test("Invalid locale in the data is ignored", () => {
      const invalidLocale = { ...FR_LOCALE, dateFormat: "I'm not a real format 💀" };
      const model = new Model({ settings: { locale: invalidLocale } });
      expect(model.getters.getLocale()).toEqual(DEFAULT_LOCALE);
    });

    test("locale thousand separator", () => {
      setCellContent(model, "A1", "1000000");
      setFormat(model, "A1", "#,##0");
      expect(getCellContent(model, "A1")).toEqual("1,000,000");

      const locale = { ...CUSTOM_LOCALE, thousandsSeparator: "¤" };
      updateLocale(model, locale);
      expect(getCellContent(model, "A1")).toEqual("1¤000¤000");
    });

    test("locale decimal separator", () => {
      setCellContent(model, "A1", "9.89");
      setFormat(model, "A1", "#,##0.00");
      expect(getCellContent(model, "A1")).toEqual("9.89");

      const locale = { ...CUSTOM_LOCALE, decimalSeparator: "♥" };
      updateLocale(model, locale);
      expect(getCellContent(model, "A1")).toEqual("9♥89");
    });

    test("locale thousand separator", () => {
      setCellContent(model, "A1", "1000000");
      setFormat(model, "A1", "#,##0");
      expect(getCellContent(model, "A1")).toEqual("1,000,000");

      const locale = { ...CUSTOM_LOCALE, thousandsSeparator: "¤" };
      updateLocale(model, locale);
      expect(getCellContent(model, "A1")).toEqual("1¤000¤000");
    });

    test("locale decimal separator", () => {
      setCellContent(model, "A1", "9.89");
      setFormat(model, "A1", "#,##0.00");
      expect(getCellContent(model, "A1")).toEqual("9.89");

      const locale = { ...CUSTOM_LOCALE, decimalSeparator: "♥" };
      updateLocale(model, locale);
      expect(getCellContent(model, "A1")).toEqual("9♥89");
    });

    test("Changing the locale changes the format of the cells that are formatted with the locale date(time) format", () => {
      setFormat(model, "A1", DEFAULT_LOCALE.dateFormat);
      setFormat(model, "A2", DEFAULT_LOCALE.timeFormat);
      setFormat(model, "A3", getDateTimeFormat(DEFAULT_LOCALE));

      const locale = { ...CUSTOM_LOCALE, dateFormat: "yyyy/mm/dd", timeFormat: "hh:mm" };
      updateLocale(model, locale);
      expect(getCell(model, "A1")?.format).toEqual("yyyy/mm/dd");
      expect(getCell(model, "A2")?.format).toEqual("hh:mm");
      expect(getCell(model, "A3")?.format).toEqual("yyyy/mm/dd hh:mm");
    });
  });
});
