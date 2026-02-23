import { Color, HSLA } from "../..";
import { hexToHSLA, hslaToHex } from "../../helpers/color";
import { UIPlugin } from "../ui_plugin";

const darkColors: Map<Color, Color> = new Map();

/* This function takes a color in HSLA format and transforms it to a darker version suitable for dark mode.
 * The transformation is designed to maintain the color's identity while making it darker and less saturated,
 * while ensuring that very light colors (close to white) are transformed into a specific dark blue color to
 * maintain contrast and readability without having black background.
 */
function transformToDarkMode(color: HSLA): HSLA {
  const { h, s, l } = color;
  const darkest = { h: 229, s: 17, l: 13 }; // #1b1d26

  // Light: we map [0, 100] to [100, 13] (inversion + remapping)
  const newL = 100 - l * (1 - 0.01 * darkest.l);
  const influence = 0.01 * l;

  // Saturation : we mix the original saturation with the darkest saturation based on the influence factor.
  const newS = s * (1 - influence) + darkest.s * influence;

  // Here, we decide how much to adjust the hue based on saturation. If the color is very desaturated (close to gray),
  // we pull it towards the darkest hue. Otherwise, we keep the original hue to preserve color identity.
  let newH = h;
  if (s < 10) {
    const hInfluence = (1 - 0.1 * s) * influence;
    newH = h * (1 - hInfluence) + darkest.h * hInfluence;
  }

  return {
    h: Math.round(newH),
    s: Math.round(newS),
    l: Math.round(newL),
    a: color.a,
  };
}

export class ColorthemeUIPlugin extends UIPlugin {
  static getters = ["getAdaptedColor"] as const;

  getAdaptedColor(color: Color): Color {
    if (!this.getters.isDarkMode()) {
      return color;
    }
    if (!darkColors.has(color)) {
      const hsla = hexToHSLA(color);
      const newColor = transformToDarkMode(hsla);
      const darkColor = hslaToHex(newColor);
      darkColors.set(color, darkColor);
      return darkColor;
    }
    return darkColors.get(color)!;
  }
}
