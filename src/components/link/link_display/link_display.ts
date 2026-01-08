import { LINK_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { openLink, urlRepresentation } from "@odoo/o-spreadsheet-engine/helpers/links";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { toXC } from "../../../helpers";
import { Store, useStore } from "../../../store_engine";
import { EvaluatedCell, Link, Position } from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { isMiddleClickOrCtrlClick } from "../../helpers/dom_helpers";
import { CellPopoverStore } from "../../popover/cell_popover_store";

interface LinkDisplayProps {
  cellPosition: Position;
}

export class LinkDisplay extends Component<LinkDisplayProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LinkDisplay";
  static props = {
    cellPosition: Object,
    onClosed: { type: Function, optional: true },
  };

  protected cellPopovers!: Store<CellPopoverStore>;

  setup() {
    this.cellPopovers = useStore(CellPopoverStore);
  }

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
