import { Component } from "@odoo/owl";
import { Figure, UID } from "../../../../..";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { Section } from "../../../components/section/section";

interface Props {
  figureId: UID;
  isInitiallyCollapsed?: boolean;
}

export class FigureOptions extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.FigureOptions";
  static components = { Section, Checkbox, SidePanelCollapsible };
  static props = {
    figureId: String,
    isInitiallyCollapsed: { type: Boolean, optional: true },
  };

  get figure(): Figure {
    const figure = this.env.model.getters.getFigure(this.sheetId, this.props.figureId);
    if (!figure) {
      throw new Error(`Figure with id ${this.props.figureId} not found`);
    }
    return figure;
  }

  get sheetId(): UID {
    const sheetId = this.env.model.getters.getFigureSheetId(this.props.figureId);
    if (!sheetId) {
      throw new Error(`Sheet id for figure with id ${this.props.figureId} not found`);
    }
    return sheetId;
  }

  updateRoundedBorders(value: boolean) {
    this.env.model.dispatch("UPDATE_FIGURE", {
      sheetId: this.sheetId,
      figureId: this.props.figureId,
      ...this.figure,
      roundedBorders: value,
    });
  }

  updateShadow(value: boolean) {
    this.env.model.dispatch("UPDATE_FIGURE", {
      sheetId: this.sheetId,
      figureId: this.props.figureId,
      ...this.figure,
      shadow: value,
    });
  }
}
