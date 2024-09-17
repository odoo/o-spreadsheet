import { Model } from "../../src";
import { SettingsPanel } from "../../src/components/side_panel/settings/settings_panel";
import { DEFAULT_LOCALE, DEFAULT_LOCALES, Locale, SpreadsheetChildEnv } from "../../src/types";
import { updateLocale } from "../test_helpers/commands_helpers";
import { CUSTOM_LOCALE, FR_LOCALE } from "../test_helpers/constants";
import { setInputValueAndTrigger } from "../test_helpers/dom_helper";
import { mountComponent, nextTick } from "../test_helpers/helpers";

describe("settings sidePanel component", () => {
  let model: Model;
  let fixture: HTMLElement;
  let onCloseSidePanel: jest.Mock;

  async function mountSettingsSidePanel(modelArg?: Model, env?: Partial<SpreadsheetChildEnv>) {
    model = modelArg ?? new Model();
    ({ fixture } = await mountComponent(SettingsPanel, {
      model,
      props: { onCloseSidePanel: () => onCloseSidePanel() },
      env,
    }));
    await nextTick();
  }

  function getLocalePreview() {
    const preview = fixture.querySelector<HTMLElement>(".o-locale-preview")!;

    const numberPreview = preview.children[0].children[1].textContent;
    const datePreview = preview.children[1].children[1].textContent;
    const dateTimePreview = preview.children[2].children[1].textContent;

    return { numberPreview, datePreview, dateTimePreview };
  }

  describe("Locale", () => {
    test("Locale select is initialized with correct value", async () => {
      model = new Model({ settings: { locale: FR_LOCALE } });
      await mountSettingsSidePanel(model);
      const localeInput = fixture.querySelector<HTMLInputElement>(".o-settings-panel select")!;
      expect(localeInput.value).toEqual(FR_LOCALE.code);
    });

    test("Can change locale", async () => {
      await mountSettingsSidePanel();
      setInputValueAndTrigger(".o-settings-panel select", "fr_FR");
      expect(model.getters.getLocale().code).toEqual("fr_FR");
    });

    test("Side panel is updated when model is updated", async () => {
      await mountSettingsSidePanel();
      const localeInput = fixture.querySelector<HTMLInputElement>(".o-settings-panel select")!;
      expect(localeInput.value).toEqual(DEFAULT_LOCALE.code);
      updateLocale(model, FR_LOCALE);
      await nextTick();

      expect(localeInput.value).toEqual(FR_LOCALE.code);
    });

    test("Updating locale updates the preview", async () => {
      await mountSettingsSidePanel();

      expect(getLocalePreview()).toEqual({
        numberPreview: "1,234,567.89",
        datePreview: "12/31/1899",
        dateTimePreview: "12/31/1899 02:24:00 PM",
      });

      await setInputValueAndTrigger(".o-settings-panel select", "fr_FR");
      expect(getLocalePreview()).toEqual({
        numberPreview: "1 234 567,89",
        datePreview: "31/12/1899",
        dateTimePreview: "31/12/1899 14:24:00",
      });

      updateLocale(model, DEFAULT_LOCALE);
      await nextTick();
      expect(getLocalePreview()).toEqual({
        numberPreview: "1,234,567.89",
        datePreview: "12/31/1899",
        dateTimePreview: "12/31/1899 02:24:00 PM",
      });
    });

    test("Current locale in loaded model that is not in env.loadLocales() is displayed", async () => {
      model = new Model({ settings: { locale: CUSTOM_LOCALE } });
      await mountSettingsSidePanel(model);
      const options = fixture.querySelectorAll<HTMLOptionElement>(
        ".o-settings-panel select option"
      );
      const optionValues = Array.from(options).map((option) => option.value);

      for (const defaultLocale of DEFAULT_LOCALES) {
        expect(optionValues).toContain(defaultLocale.code);
      }
      expect(optionValues).toContain(CUSTOM_LOCALE.code);
    });

    test("Malformed locales in env.loadLocales() are not displayed", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {}); // silence console.warn and don't crash the test
      const testLocales: Locale[] = [DEFAULT_LOCALE, { code: "malformed" } as any, "yo !" as any];
      const env = { loadLocales: async () => testLocales };
      await mountSettingsSidePanel(undefined, env);

      const options = fixture.querySelectorAll<HTMLOptionElement>(
        ".o-settings-panel select option"
      );
      const optionValues = Array.from(options).map((option) => option.value);
      expect(optionValues).toEqual([DEFAULT_LOCALE.code]);
    });
  });
});
