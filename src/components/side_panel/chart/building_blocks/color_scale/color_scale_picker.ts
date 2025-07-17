import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { COLORSCALES, COLORSCHEMES } from "../../../../../helpers";
import { _t } from "../../../../../translation";
import {
  ChartColorScale,
  ChartCustomColorScale,
  Color,
  SpreadsheetChildEnv,
} from "../../../../../types";
import { css, cssPropertiesToCss } from "../../../../helpers";
import { isChildEvent } from "../../../../helpers/dom_helpers";
import { Popover, PopoverProps } from "../../../../popover";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";

css/* scss */ `
  .color-scale-container {
    display: flex;
    justify-content: right;
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
  .custom-color-scale {
    border: none !important;
  }
  .custom-color-scale-container {
    border-bottom: 1px solid #d8dadd;
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
  popoverStyle: string;
  popoverProps: PopoverProps | undefined;
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
