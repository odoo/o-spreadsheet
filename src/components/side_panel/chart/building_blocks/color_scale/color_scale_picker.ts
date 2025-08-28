import { Component, onMounted, useRef } from "@odoo/owl";
import { COLORSCALES, COLORSCHEMES } from "../../../../../helpers";
import { _t } from "../../../../../translation";
import {
  ChartColorScale,
  ChartCustomColorScale,
  Color,
  SpreadsheetChildEnv,
} from "../../../../../types";
import { css, cssPropertiesToCss } from "../../../../helpers";
import { Popover } from "../../../../popover";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";

css/* scss */ `
  .color-scale-container {
    margin: 5px;
  }
  .color-scale-label {
    margin-right: 10px;
  }
  .color-scale-preview {
    height: 20px;
    width: 70%;
    border: 1px solid;
  }
  .greys-color-scale {
    background: linear-gradient(90deg, ${COLORSCHEMES.greys.join(", ")});
  }
  .blues-color-scale {
    background: linear-gradient(90deg, ${COLORSCHEMES.blues.join(", ")});
  }
  .reds-color-scale {
    background: linear-gradient(90deg, ${COLORSCHEMES.reds.join(", ")});
  }
  .greens-color-scale {
    background: linear-gradient(90deg, ${COLORSCHEMES.greens.join(", ")});
  }
  .oranges-color-scale {
    background: linear-gradient(90deg, ${COLORSCHEMES.oranges.join(", ")});
  }
  .purples-color-scale {
    background: linear-gradient(90deg, ${COLORSCHEMES.purples.join(", ")});
  }
  .viridis-color-scale {
    background: linear-gradient(90deg, ${COLORSCHEMES.viridis.join(", ")});
  }
  .cividis-color-scale {
    background: linear-gradient(90deg, ${COLORSCHEMES.cividis.join(", ")});
  }
  .rainbow-color-scale {
    background: linear-gradient(90deg, ${COLORSCHEMES.rainbow.join(", ")});
  }
  .custom-color-scale-container {
    border-bottom: 1px solid #d8dadd;
  }
  .o-chart-select-popover {
    background-color: white;
    border: 1px solid #d8dadd;
  }
`;

//https://victorpoughon.fr/css-gradients-colorcet/

const DEFAULT_CUSTOM_COLOR_SCALE: ChartCustomColorScale = {
  minColor: "#FFF5EB",
  midColor: "#FD8D3C",
  maxColor: "#7F2704",
};

interface Props {
  definition: { colorScale: ChartColorScale };
  onUpdateColorScale: (colorscale: ChartColorScale) => void;
}

export class ColorScalePicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorScalePicker";
  static components = {
    Section,
    Popover,
    RoundColorPicker,
  };
  static props = {
    definition: Object,
    onUpdateColorScale: Function,
  };

  colorScales = COLORSCALES.map((colorScale) => ({
    value: colorScale,
    label: _t(colorScale.charAt(0).toUpperCase() + colorScale.slice(1)),
    className: `${colorScale}-color-scale`,
  }));

  colorScalePreview = useRef("colorScalePreview");

  setup() {
    onMounted(() => {
      this.render();
    });
  }

  get currentColorScale(): ChartColorScale {
    return this.props.definition.colorScale || "oranges";
  }

  get currentColorScalePreview(): string {
    const currentColorScale = this.currentColorScale;
    if (typeof currentColorScale === "object") {
      return "custom-color-scale";
    }
    return currentColorScale + "-color-scale";
  }

  get currentColorScaleLabel(): string {
    if (typeof this.currentColorScale === "object") {
      return _t("Custom");
    }
    const currentColorScale = this.currentColorScale;
    return currentColorScale.charAt(0).toUpperCase() + currentColorScale.slice(1);
  }

  onColorScaleChange(value): void {
    if (value === "custom") {
      this.props.onUpdateColorScale(DEFAULT_CUSTOM_COLOR_SCALE);
    } else {
      this.props.onUpdateColorScale(value as ChartColorScale);
    }
  }

  get popoverStyle() {
    const element = this.colorScalePreview.el;
    if (!element) {
      return "";
    }
    const { left, width, bottom } = element.getBoundingClientRect();
    return cssPropertiesToCss({
      inset: "unset",
      width: `${width}px`,
      position: "relative",
      left: `${left}px`,
      top: `${bottom}px`,
    });
  }

  get customColorScale(): ChartCustomColorScale | undefined {
    if (typeof this.currentColorScale === "object") {
      return this.currentColorScale;
    }
    return undefined;
  }

  getCustomColorScaleColor(color: "minColor" | "midColor" | "maxColor") {
    return this.customColorScale?.[color] ?? "";
  }

  setCustomColorScaleColor(colorType: "minColor" | "midColor" | "maxColor", color: Color) {
    if (!color && colorType !== "midColor") {
      color = "#fff";
    }
    const customColorScale = this.customColorScale;
    if (!customColorScale) {
      return;
    }
    this.props.onUpdateColorScale({ ...customColorScale, [colorType]: color });
  }
}
