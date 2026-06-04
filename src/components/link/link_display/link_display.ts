import { LINK_COLOR } from "../../../constants";
import { toXC } from "../../../helpers/coordinates";
import { openLink, urlRepresentation } from "../../../helpers/links";
import { useStore } from "../../../store_engine/store_hooks";
import type { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { EvaluatedCell } from "../../../types/cells";
import { Link } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { isMiddleClickOrCtrlClick } from "../../helpers/dom_helpers";
import { CellPopoverStore } from "../../popover/cell_popover_store";

import { props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { useModel } from "../../owl_plugins/model_plugin";
import { types } from "../../props_validation";

export class LinkDisplay extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LinkDisplay";

  protected props = props({
    cellPosition: types.CellPosition(),
    "onClosed?": types.function([]),
  });

  protected cellPopovers!: Store<CellPopoverStore>;

  private model = useModel();

  setup() {
    this.cellPopovers = useStore(CellPopoverStore);
  }

  get cell(): EvaluatedCell {
    const { col, row } = this.props.cellPosition;
    const sheetId = this.model().getters.getActiveSheetId();
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
    openLink(this.link, this.model(), this.env, isMiddleClickOrCtrlClick(ev));
  }

  edit() {
    const { col, row } = this.props.cellPosition;
    this.model().selection.selectCell(col, row);
    this.cellPopovers.open({ col, row }, "LinkEditor");
  }

  unlink() {
    const sheetId = this.model().getters.getActiveSheetId();
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
