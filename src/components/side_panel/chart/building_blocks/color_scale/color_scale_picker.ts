import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { DEFAULT_CHART_COLOR_SCALE } from "../../../../../constants";
import { ColorScale, COLORSCALES, COLORSCHEMES } from "../../../../../helpers";
import { ChartColorScale, Color, SpreadsheetChildEnv } from "../../../../../types";
import { schemeToColorScale } from "../../../../../types/chart/chart";
import { cssPropertiesToCss } from "../../../../helpers";
import { isChildEvent } from "../../../../helpers/dom_helpers";
import { Popover, PopoverProps } from "../../../../popover";
import { ChartTerms } from "../../../../translations_terms";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";

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
    useExternalListener(window, "pointerdown", this.onExternalClick, { capture: true });
  }

  onExternalClick(ev: MouseEvent) {
    if (isChildEvent(this.popoverRef.el?.parentElement, ev)) {
      return;
    }
    this.closePopover();
  }

  get currentColorScale(): ChartColorScale {
    return this.props.definition.colorScale || schemeToColorScale("oranges");
  }

  get currentColorScalePreview(): string {
    return this.selectedColorScale + "-color-scale";
  }

  get currentColorScaleStyle(): string | undefined {
    const colorScale = this.currentColorScale;
    const minColor = colorScale.minColor || "#fff";
    const midColor = colorScale.midColor;
    const maxColor = colorScale.maxColor || "#000";
    if (midColor) {
      return `background: linear-gradient(90deg, ${minColor}, ${midColor}, ${maxColor});`;
    } else {
      return `background: linear-gradient(90deg, ${minColor}, ${maxColor});`;
    }
  }

  colorScalePreviewStyle(colorScale: ColorScale): string {
    return `background: linear-gradient(90deg, ${COLORSCHEMES[colorScale].join(",")});`;
  }

  get currentColorScaleLabel(): string {
    return ChartTerms.ColorScales[this.selectedColorScale];
  }

  onColorScaleChange(value): void {
    if (value === "custom") {
      this.props.onUpdateColorScale(DEFAULT_CHART_COLOR_SCALE);
    } else {
      this.props.onUpdateColorScale(schemeToColorScale(value)!);
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

  get selectedColorScale(): string {
    if (!this.props.definition.colorScale) {
      return "oranges";
    }
    const { minColor, midColor, maxColor } = this.props.definition.colorScale || {};
    for (const [name, scale] of Object.entries(COLORSCHEMES)) {
      if (scale[0] === minColor && scale[2] === maxColor && scale[1] === midColor) {
        return name;
      }
    }
    return "custom";
  }

  getCustomColorScaleColor(color: "minColor" | "midColor" | "maxColor") {
    return this.props.definition.colorScale?.[color] ?? "";
  }

  setCustomColorScaleColor(colorType: "minColor" | "midColor" | "maxColor", color: Color) {
    if (!color && colorType !== "midColor") {
      color = "#fff";
    }
    const customColorScale = this.currentColorScale;
    if (!customColorScale) {
      return;
    }
    this.props.onUpdateColorScale({ ...customColorScale, [colorType]: color });
  }
}
