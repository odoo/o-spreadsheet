import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { ColorScale, COLORSCALES, COLORSCHEMES } from "../../../../../helpers";
import { _t } from "../../../../../translation";
import {
  ChartColorScale,
  ChartCustomColorScale,
  Color,
  SpreadsheetChildEnv,
} from "../../../../../types";
import { cssPropertiesToCss } from "../../../../helpers";
import { Popover, PopoverProps } from "../../../../popover";
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
  popoverProps: PopoverProps | undefined;
  popoverStyle: string;
}

export class ColorScalePicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorScalePicker";
  static components = {
    Section,
    RoundColorPicker,
    Popover,
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

  state = useState<ColorScalePickerState>({ popoverProps: undefined, popoverStyle: "" });
  popoverRef = useRef("popoverRef");

  setup(): void {
    useExternalListener(window, "click", this.closePopover);
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
    if (this.state.popoverProps) {
      this.closePopover();
      return;
    }
    const target = ev.currentTarget as HTMLElement;
    const { bottom, right, width } = target.getBoundingClientRect();
    this.state.popoverProps = {
      anchorRect: { x: right, y: bottom, width: 0, height: 0 },
      positioning: "top-right",
      verticalOffset: 0,
    };
    this.state.popoverStyle = cssPropertiesToCss({ width: `${width}px` });
  }

  private closePopover() {
    this.state.popoverProps = undefined;
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
