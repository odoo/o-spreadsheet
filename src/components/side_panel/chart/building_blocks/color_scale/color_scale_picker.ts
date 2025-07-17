import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { COLORSCALES, COLORSCHEMES } from "../../../../../helpers";
import { _t } from "../../../../../translation";
import {
  ChartColorScale,
  ChartCustomColorScale,
  Color,
  SpreadsheetChildEnv,
} from "../../../../../types";
import { css } from "../../../../helpers";
import { isChildEvent } from "../../../../helpers/dom_helpers";
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
    padding-bottom: 5px;
    border-bottom: 1px solid #d8dadd;
  }
  .custom-color-scale {
    background: url(data:image/svg+xml,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2210%22%3E%0A%20%20%3Cpath%20fill%3D%22%23d9d9d9%22%20d%3D%22M5%205h5v5H5zH0V0h5%22%2F%3E%0A%3C%2Fsvg%3E%0A);
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

interface ColorScalePickerState {
  isListOpen: boolean;
}

export class ColorScalePicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorScalePicker";
  static components = {
    Section,
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

  state = useState<ColorScalePickerState>({ isListOpen: false });
  popoverRef = useRef("popoverRef");

  setup(): void {
    useExternalListener(window, "pointerdown", this.onExternalClick, { capture: true });
  }

  onExternalClick(ev: MouseEvent) {
    if (isChildEvent(this.popoverRef.el?.parentElement, ev)) {
      return;
    }
    this.closePopover();
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

  get currentColorScaleStyle(): string | undefined {
    const currentColorScale = this.currentColorScale;
    if (typeof currentColorScale === "object") {
      const minColor = currentColorScale.minColor || "#fff";
      const midColor = currentColorScale.midColor;
      const maxColor = currentColorScale.maxColor || "#000";
      if (midColor) {
        return `background: linear-gradient(90deg, ${minColor}, ${midColor}, ${maxColor});`;
      } else {
        return `background: linear-gradient(90deg, ${minColor}, ${maxColor});`;
      }
    }
    return undefined;
  }

  get currentColorScaleLabel(): string {
    if (typeof this.currentColorScale === "object") {
      return _t("Custom");
    }
    const currentColorScale = this.currentColorScale;
    return _t(currentColorScale.charAt(0).toUpperCase() + currentColorScale.slice(1));
  }

  onColorScaleChange(value): void {
    if (value === "custom") {
      this.props.onUpdateColorScale(DEFAULT_CUSTOM_COLOR_SCALE);
    } else {
      this.props.onUpdateColorScale(value as ChartColorScale);
    }
    this.closePopover();
  }

  onPointerDown(ev: PointerEvent) {
    if (this.state.isListOpen) {
      this.closePopover();
      return;
    }
    this.state.isListOpen = true;
  }

  private closePopover() {
    this.state.isListOpen = false;
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
