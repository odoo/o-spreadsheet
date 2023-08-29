import { CommandResult, Model } from "../../src";
import { DEFAULT_LOCALE, Locale } from "../../src/types/locale";
import {
  redo,
  setCellContent,
  setFormat,
  undo,
  updateLocale,
} from "../test_helpers/commands_helpers";
import { CUSTOM_LOCALE, FR_LOCALE } from "../test_helpers/constants";
import { getCellContent } from "../test_helpers/getters_helpers";
import { target } from "../test_helpers/helpers";

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
      setFormat(model, "#,##0", target("A1"));
      expect(getCellContent(model, "A1")).toEqual("1,000,000");

      const locale = { ...CUSTOM_LOCALE, thousandsSeparator: "¤" };
      updateLocale(model, locale);
      expect(getCellContent(model, "A1")).toEqual("1¤000¤000");
    });

    test("locale decimal separator", () => {
      setCellContent(model, "A1", "9.89");
      setFormat(model, "#,##0.00", target("A1"));
      expect(getCellContent(model, "A1")).toEqual("9.89");

      const locale = { ...CUSTOM_LOCALE, decimalSeparator: "♥" };
      updateLocale(model, locale);
      expect(getCellContent(model, "A1")).toEqual("9♥89");
    });

    test("locale thousand separator", () => {
      setCellContent(model, "A1", "1000000");
      setFormat(model, "#,##0", target("A1"));
      expect(getCellContent(model, "A1")).toEqual("1,000,000");

      const locale = { ...CUSTOM_LOCALE, thousandsSeparator: "¤" };
      updateLocale(model, locale);
      expect(getCellContent(model, "A1")).toEqual("1¤000¤000");
    });

    test("locale decimal separator", () => {
      setCellContent(model, "A1", "9.89");
      setFormat(model, "#,##0.00", target("A1"));
      expect(getCellContent(model, "A1")).toEqual("9.89");

      const locale = { ...CUSTOM_LOCALE, decimalSeparator: "♥" };
      updateLocale(model, locale);
      expect(getCellContent(model, "A1")).toEqual("9♥89");
    });
  });
});
