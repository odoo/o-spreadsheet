import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { getPivotHighlights } from "../../../../helpers/pivot/pivot_highlight";
import { pivotSidePanelRegistry } from "../../../../helpers/pivot/pivot_side_panel_registry";
import { UID } from "../../../../types";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { useHighlights } from "../../../helpers/highlight_hook";
import { Section } from "../../components/section/section";
import { PivotLayoutConfigurator } from "../pivot_layout_configurator/pivot_layout_configurator";
import { PivotDesignPanel } from "./pivot_design_panel/pivot_design_panel";

interface Props {
  pivotId: UID;
  onCloseSidePanel: () => void;
  openTab: "configuration" | "design";
}

interface State {
  panel: "configuration" | "design";
}

export class PivotSidePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotSidePanel";
  static props = {
    pivotId: String,
    onCloseSidePanel: Function,
    openTab: { type: String, optional: true },
  };
  static defaultProps = { openTab: "configuration" };
  static components = {
    PivotLayoutConfigurator,
    Section,
    PivotDesignPanel,
  };

  state = useState<State>({ panel: this.props.openTab || "configuration" });

  setup() {
    useHighlights(this);
    onWillUpdateProps((nextProps) => {
      if (nextProps.openTab && nextProps.openTab !== this.props.openTab) {
        this.switchPanel(nextProps.openTab);
      }
    });
  }

  get sidePanelEditor() {
    const pivot = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
    if (!pivot) {
      throw new Error("pivotId does not correspond to a pivot.");
    }
    return pivotSidePanelRegistry.get(pivot.type).editor;
  }

  get highlights() {
    return this.state.panel === "configuration"
      ? getPivotHighlights(this.env.model.getters, this.props.pivotId)
      : [];
  }

  switchPanel(panel: "configuration" | "design") {
    this.state.panel = panel;
  }
}
