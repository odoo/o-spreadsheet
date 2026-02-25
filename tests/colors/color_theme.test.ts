import { transformToDarkMode } from "../../packages/o-spreadsheet-engine/src/plugins/ui_feature/color_theme";

describe("transformToDarkMode", () => {
  test("adapts light colors to dark variants", () => {
    // White -> Darkest background
    expect(transformToDarkMode({ h: 0, s: 0, l: 100, a: 1 })).toEqual({
      h: 229,
      s: 17,
      l: 13,
      a: 1,
    });

    // Pure Red
    expect(transformToDarkMode({ h: 0, s: 100, l: 50, a: 1 })).toEqual({
      h: 0,
      s: 59,
      l: 57,
      a: 1,
    });

    // Pure Green
    expect(transformToDarkMode({ h: 120, s: 100, l: 50, a: 1 })).toEqual({
      h: 120,
      s: 59,
      l: 57,
      a: 1,
    });

    // Pure Blue
    expect(transformToDarkMode({ h: 240, s: 100, l: 50, a: 1 })).toEqual({
      h: 240,
      s: 59,
      l: 57,
      a: 1,
    });

    // Dark Gray
    expect(transformToDarkMode({ h: 0, s: 0, l: 20, a: 1 })).toEqual({ h: 46, s: 3, l: 83, a: 1 });

    // Light Gray
    expect(transformToDarkMode({ h: 0, s: 0, l: 80, a: 1 })).toEqual({
      h: 183,
      s: 14,
      l: 30,
      a: 1,
    });
  });

  test("preserves hue for saturated colors", () => {
    const saturatedLightBlue = { h: 200, s: 90, l: 70, a: 1 };
    const adapted = transformToDarkMode(saturatedLightBlue);
    expect(adapted.h).toBe(200);
    expect(adapted.s).toBeLessThan(90); // Saturation should decrease
    expect(adapted.l).toBeLessThan(70); // Lightness should decrease
  });

  test("pulls hue towards dark background for desaturated colors", () => {
    const desaturatedColor = { h: 100, s: 5, l: 90, a: 1 };
    const adapted = transformToDarkMode(desaturatedColor);
    expect(adapted.h).not.toBe(100);
    // It should be pulled towards 229
    expect(adapted.h).toBeGreaterThan(100);
  });
});
