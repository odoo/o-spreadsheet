import { props, proxy, signal } from "@odoo/owl";
import { DEFAULT_CHART_COLOR_SCALE } from "../../../../../constants";
import { ColorScale, COLORSCALES, COLORSCHEMES } from "../../../../../helpers/color";
import { Component, useExternalListener } from "../../../../../owl3_compatibility_layer";
import { ChartColorScale, schemeToColorScale } from "../../../../../types/chart/chart";
import { Color } from "../../../../../types/misc";
import { PropsOf } from "../../../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../../../../helpers/css";
import { Popover } from "../../../../popover/popover";
import { types } from "../../../../props_validation";
import { ChartTerms } from "../../../../translations_terms";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";

interface ColorScalePickerState {
  popoverProps: PropsOf<Popover> | undefined;
  popoverStyle: string;
}

export class ColorScalePicker extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorScalePicker";
  static components = {
    Section,
    RoundColorPicker,
    Popover,
  };

  protected props = props({
    definition: types.object({ colorScale: types.ChartColorScale().optional() }),
    onUpdateColorScale: types.function<(colorscale: ChartColorScale) => void>(),
  });

  colorScales = COLORSCALES.map((colorScale) => ({
    value: colorScale,
    label: ChartTerms.ColorScales[colorScale],
    className: `${colorScale}-color-scale`,
  }));

  state = proxy<ColorScalePickerState>({ popoverProps: undefined, popoverStyle: "" });
  popoverRef = signal<HTMLElement | null>(null);

  setup() {
    useExternalListener(window, "click", this.closePopover);
  }

  get currentColorScale(): ChartColorScale {
    return this.props.definition.colorScale || (schemeToColorScale("oranges") as ChartColorScale);
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

  onColorScaleChange(value: string) {
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
