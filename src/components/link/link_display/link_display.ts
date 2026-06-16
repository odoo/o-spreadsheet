import { LINK_COLOR } from "../../../constants";
import { toXC } from "../../../helpers/coordinates";
import { openLink, urlRepresentation } from "../../../helpers/links";
import type { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { EvaluatedCell } from "../../../types/cells";
import { Link } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { isMiddleClickOrCtrlClick } from "../../helpers/dom_helpers";

import { plugin, props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { CellPopoverPlugin } from "../../owl_plugins/cell_popover_plugin";
import { types } from "../../props_validation";

export class LinkDisplay extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LinkDisplay";

  protected props = props({
    cellPosition: types.CellPosition(),
    "onClosed?": types.function(),
  });

  protected cellPopovers = plugin(CellPopoverPlugin);

  get cell(): EvaluatedCell {
    const { col, row } = this.props.cellPosition;
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getEvaluatedCell({ sheetId, col, row });
  }

  get link(): Link {
    if (this.cell.link) {
      return this.cell.link;
    }
    const { col, row } = this.props.cellPosition;
    throw new Error(
      `LinkDisplay Component can only be used with link cells. ${toXC(col, row)} is not a link.`
    );
  }

  getUrlRepresentation(link: Link): string {
    return urlRepresentation(link, this.env.model.getters);
  }

  openLink(ev: MouseEvent) {
    openLink(this.link, this.env, isMiddleClickOrCtrlClick(ev));
  }

  edit() {
    const { col, row } = this.props.cellPosition;
    this.env.model.selection.selectCell(col, row);
    this.cellPopovers.open({ col, row }, "LinkEditor");
  }

  unlink() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const { col, row } = this.props.cellPosition;
    const style = this.env.model.getters.getCellComputedStyle({ sheetId, col, row });
    const textColor = style?.textColor === LINK_COLOR ? undefined : style?.textColor;
    this.env.model.dispatch("UPDATE_CELL", {
      col,
      row,
      sheetId,
      content: this.link.label,
      style: { ...style, textColor, underline: undefined },
    });
  }
}

export const LinkCellPopoverBuilder: PopoverBuilders = {
  onHover: (position, getters): CellPopoverComponent<typeof LinkDisplay> => {
    const cell = getters.getEvaluatedCell(position);
    const shouldDisplayLink =
      !getters.isDashboard() && cell.link && getters.isVisibleInViewport(position);
    if (!shouldDisplayLink) {
      return { isOpen: false };
    }
    return {
      isOpen: true,
      Component: LinkDisplay,
      props: { cellPosition: position },
      cellCorner: "bottom-left",
    };
  },
};
