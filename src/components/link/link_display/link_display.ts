import { LINK_COLOR } from "../../../constants";
import { toXC } from "../../../helpers/coordinates";
import { openLink, urlRepresentation } from "../../../helpers/links";
import type { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { EvaluatedCell } from "../../../types/cells";
import { Link } from "../../../types/misc";
import { isMiddleClickOrCtrlClick } from "../../helpers/dom_helpers";
import { OSComponent } from "../../os_component";
import { CellPopoverPlugin } from "../../popover/cell_popover_owl_plugin";

import { usePlugin, useProps } from "@odoo/owl";
import { ViewportsPlugin } from "../../../owl_plugins/viewports_owl_plugin";
import { types } from "../../props_validation";

export class LinkDisplay extends OSComponent {
  static template = "o-spreadsheet-LinkDisplay";

  protected props = useProps({
    cellPosition: types.CellPosition(),
    onClosed: types.function().optional(),
  });

  private cellPopovers = usePlugin(CellPopoverPlugin);
  private viewPlugin = usePlugin(ViewportsPlugin);

  get cell(): EvaluatedCell {
    const { col, row } = this.props.cellPosition;
    const sheetId = this.viewPlugin.displayedSheetId();
    return this.model().getters.getEvaluatedCell({ sheetId, col, row });
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
    return urlRepresentation(link, this.model().getters);
  }

  openLink(ev: MouseEvent) {
    openLink(this.link, this.spEnv, isMiddleClickOrCtrlClick(ev));
  }

  edit() {
    const { col, row } = this.props.cellPosition;
    this.model().selection.selectCell(col, row);
    this.cellPopovers.open({ col, row }, "LinkEditor");
  }

  unlink() {
    const sheetId = this.viewPlugin.displayedSheetId();
    const { col, row } = this.props.cellPosition;
    const style = this.model().getters.getCellComputedStyle({ sheetId, col, row });
    const textColor = style?.textColor === LINK_COLOR ? undefined : style?.textColor;
    this.model().dispatch("UPDATE_CELL", {
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
    const shouldDisplayLink = !getters.isDashboard() && cell.link;
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
