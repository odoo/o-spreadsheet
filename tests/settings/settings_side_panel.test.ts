import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model } from "../../src";
import { SettingsPanel } from "../../src/components/side_panel/settings/settings_panel";
import { DEFAULT_LOCALE, DEFAULT_LOCALES, Locale } from "../../src/types";
import { updateLocale } from "../test_helpers/commands_helpers";
import { CUSTOM_LOCALE, FR_LOCALE } from "../test_helpers/constants";
import { editSelectComponent, simulateClick } from "../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, nextTick } from "../test_helpers/helpers";

describe("settings sidePanel component", () => {
  let model: Model;
  let fixture: HTMLElement;

  async function mountSettingsSidePanel(modelArg?: Model, env?: Partial<SpreadsheetChildEnv>) {
    model = modelArg ?? new Model();
    ({ fixture } = await mountComponentWithPortalTarget(SettingsPanel, {
      model,
      props: { onCloseSidePanel: () => {} },
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
      expect(".o-settings-panel .o-select").toHaveText("French");
    });

    test("Can change locale", async () => {
      await mountSettingsSidePanel();
      await editSelectComponent(".o-settings-panel .o-select", "fr_FR");
      expect(model.getters.getLocale().code).toEqual("fr_FR");
    });

    test("Side panel is updated when model is updated", async () => {
      await mountSettingsSidePanel();
      expect(".o-settings-panel .o-select").toHaveText("English (US)");
      updateLocale(model, FR_LOCALE);
      await nextTick();

      expect(".o-settings-panel .o-select").toHaveText("French");
    });

    test("Updating locale updates the preview", async () => {
      await mountSettingsSidePanel();

      expect(getLocalePreview()).toEqual({
        numberPreview: "1,234,567.89",
        datePreview: "12/31/1899",
        dateTimePreview: "12/31/1899 02:24:00 PM",
      });

      await editSelectComponent(".o-settings-panel .o-select", "fr_FR");
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
      await simulateClick(".o-settings-panel .o-select");
      const options = fixture.querySelectorAll<HTMLOptionElement>(".o-popover .o-select-option");
      const optionValues = Array.from(options).map((option) => option.dataset.id);

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

      await simulateClick(".o-settings-panel .o-select");
      const options = fixture.querySelectorAll<HTMLOptionElement>(".o-select-option");
      const optionValues = Array.from(options).map((option) => option.dataset.id);
      expect(optionValues).toEqual([DEFAULT_LOCALE.code]);
    });
  });
});
