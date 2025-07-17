import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { COLORMAPS } from "../../../../helpers/figures/charts/colormap";
import { _t } from "../../../../translation";
import { TimeMatrixChartDefinition } from "../../../../types/chart/time_matrix_chart";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { css, cssPropertiesToCss } from "../../../helpers";
import { isChildEvent } from "../../../helpers/dom_helpers";
import { Popover, PopoverProps } from "../../../popover";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { Section } from "../../components/section/section";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartLegend } from "../building_blocks/legend/legend";
import { ChartShowValues } from "../building_blocks/show_values/show_values";

css/* scss */ `
  .colormap-container {
    display: flex;
    justify-content: right;
    margin: 5px;
  }
  .colormap-label {
    margin-right: 10px;
  }
  .colormap-preview {
    height: 20px;
    width: 70%;
    border: 1px solid;
  }
`;

//https://victorpoughon.fr/css-gradients-colorcet/

interface Props {
  figureId: UID;
  definition: TimeMatrixChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<TimeMatrixChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<TimeMatrixChartDefinition>) => DispatchResult;
}

interface TimeMatrixChartDesignPanelState {
  popoverStyle: string;
  popoverProps: PopoverProps | undefined;
}

export class TimeMatrixChartDesignPanel<P extends Props = Props> extends Component<
  P,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-TimeMatrixChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    SidePanelCollapsible,
    Section,
    AxisDesignEditor,
    ChartLegend,
    ChartShowValues,
    Popover,
  };
  static props = {
    figureId: String,
    definition: Object,
    canUpdateChart: Function,
    updateChart: Function,
  };

  colormaps = COLORMAPS.map((colormap) => ({
    value: colormap,
    label: _t(colormap.charAt(0).toUpperCase() + colormap.slice(1)),
    className: `${colormap}-colormap`,
  }));

  state = useState<TimeMatrixChartDesignPanelState>({ popoverProps: undefined, popoverStyle: "" });
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

  get axesList(): AxisDefinition[] {
    return [
      { id: "x", name: _t("Horizontal axis") },
      { id: "y", name: _t("Vertical axis") },
    ];
  }

  get currentColormap(): string {
    return this.props.definition.colormap || "greys";
  }

  get currentColormapPreview(): string {
    return this.currentColormap + "-colormap";
  }

  get currentColormapLabel(): string {
    const currentColormap = this.currentColormap;
    return _t(currentColormap.charAt(0).toUpperCase() + currentColormap.slice(1));
  }

  onColormapChange(colormap): void {
    this.props.updateChart(this.props.figureId, {
      colormap,
    });
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
}
