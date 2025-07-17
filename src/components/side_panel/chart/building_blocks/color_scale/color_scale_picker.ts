import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { ColorScale, COLORSCALES, COLORSCHEMES } from "../../../../../helpers";
import { _t } from "../../../../../translation";
import {
  ChartColorScale,
  ChartCustomColorScale,
  Color,
  SpreadsheetChildEnv,
} from "../../../../../types";
import { isChildEvent } from "../../../../helpers/dom_helpers";
import { ChartTerms } from "../../../../translations_terms";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";

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
    label: ChartTerms.ColorScales[colorScale],
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
    return this.colorScalePreviewStyle(currentColorScale);
  }

  colorScalePreviewStyle(colorScale: ColorScale): string {
    return `background: linear-gradient(90deg, ${COLORSCHEMES[colorScale].join(",")});`;
  }

  get currentColorScaleLabel(): string {
    if (typeof this.currentColorScale === "object") {
      return _t("Custom");
    }
    return ChartTerms.ColorScales[this.currentColorScale];
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
