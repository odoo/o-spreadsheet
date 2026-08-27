import { COLOR_THEMES } from "../../src/helpers/color_themes";
import { Model } from "../../src/model";
import { MockTransportService } from "../__mocks__/transport_service";

const expectedLightTheme = COLOR_THEMES.light;
const expectedDarkTheme = COLOR_THEMES.dark;

const THEME_KEYS = Object.keys(expectedLightTheme);
describe("ColorThemeUIPlugin via Model getters", () => {
  test("getSpreadsheetTheme returns correct colors in light mode", () => {
    const model = new Model(
      {},
      {
        transportService: new MockTransportService(),
        client: { id: "test", name: "Test" },
        colorScheme: "light",
      }
    );
    const theme = model.getters.getSpreadsheetTheme();
    for (const key of THEME_KEYS) {
      if (key === "colorThemeName") {
        continue;
      }
      expect(theme[key]).toBeSameColorAs(expectedLightTheme[key]);
    }
  });

  test("getSpreadsheetTheme returns correct colors in dark mode", async () => {
    const model = new Model(
      {},
      {
        transportService: new MockTransportService(),
        client: { id: "test", name: "Test" },
        colorScheme: "dark",
      }
    );
    const theme = model.getters.getSpreadsheetTheme();
    for (const key of THEME_KEYS) {
      if (key === "colorThemeName") {
        continue;
      }
      expect(theme[key]).toBeSameColorAs(expectedDarkTheme[key]);
    }
  });

  test("getSpreadsheetTheme is updated when color scheme changes", async () => {
    const model = new Model(
      {},
      {
        transportService: new MockTransportService(),
        client: { id: "test", name: "Test" },
        colorScheme: "light",
      }
    );
    let theme = model.getters.getSpreadsheetTheme();
    expect(theme.backgroundColor.toUpperCase()).toBe(expectedLightTheme.backgroundColor);

    // Simulate color scheme change
    model.dispatch("UPDATE_COLOR_SCHEME", { colorScheme: "dark" });
    theme = model.getters.getSpreadsheetTheme();
    expect(theme.backgroundColor.toUpperCase()).toBe(expectedDarkTheme.backgroundColor);
  });
});
