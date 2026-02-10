import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { getPivotHighlights } from "../../../../helpers/pivot/pivot_highlight";
import { pivotSidePanelRegistry } from "../../../../helpers/pivot/pivot_side_panel_registry";
import { Pixel, UID } from "../../../../types";
import { useHighlights } from "../../../helpers/highlight_hook";
import { Section } from "../../components/section/section";
import { PivotLayoutConfigurator } from "../pivot_layout_configurator/pivot_layout_configurator";
import { PivotDesignPanel } from "./pivot_design_panel/pivot_design_panel";

interface Props {
  pivotId: UID;
  onCloseSidePanel: () => void;
}

interface State {
  panel: "configuration" | "design";
}

export class PivotSidePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotSidePanel";
  static props = {
    pivotId: String,
    onCloseSidePanel: Function,
  };
  static components = {
    PivotLayoutConfigurator,
    Section,
    PivotDesignPanel,
  };

  state = useState<State>({ panel: "configuration" });
  private panelContentRef = useRef<HTMLElement>("panelContent");
  private scrollPositions: Record<"configuration" | "design", Pixel> = {
    configuration: 0,
    design: 0,
  };

  setup() {
    useHighlights(this);
    useEffect(
      () => {
        const el = this.panelContentRef.el as HTMLElement;
        if (el) {
          el.scrollTop = this.scrollPositions[this.state.panel];
        }
      },
      () => [this.state.panel]
    );
  }

  get sidePanelEditor() {
    const pivot = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
    if (!pivot) {
      throw new Error("pivotId does not correspond to a pivot.");
    }
    return pivotSidePanelRegistry.get(pivot.type).editor;
  }

  get highlights() {
    return getPivotHighlights(this.env.model.getters, this.props.pivotId);
  }

  switchPanel(panel: "configuration" | "design") {
    const el = this.panelContentRef.el as HTMLElement;
    if (el) {
      this.scrollPositions[this.state.panel] = el.scrollTop;
    }
    this.state.panel = panel;
  }
}
