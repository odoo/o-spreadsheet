import { Component } from "@odoo/owl";
import { LINK_COLOR } from "../../../constants";
import { toXC } from "../../../helpers";
import { openLink, urlRepresentation } from "../../../helpers/links";
import type { EvaluatedCell, Link, Position, SpreadsheetChildEnv } from "../../../types";
import type { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { css } from "../../helpers/css";
import { Menu } from "../../menu/menu";

const LINK_TOOLTIP_HEIGHT = 32;
const LINK_TOOLTIP_WIDTH = 220;

css/* scss */ `
  .o-link-tool {
    font-size: 13px;
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    padding: 6px 12px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    height: ${LINK_TOOLTIP_HEIGHT}px;
    width: ${LINK_TOOLTIP_WIDTH}px;
    box-sizing: border-box !important;

    img {
      margin-right: 3px;
      width: 16px;
      height: 16px;
    }

    a.o-link {
      color: #01666b;
      text-decoration: none;
      flex-grow: 2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    a.o-link:hover {
      text-decoration: none;
      color: #001d1f;
      cursor: pointer;
    }
  }
  .o-link-icon {
    float: right;
    padding-left: 5px;
    .o-icon {
      height: 16px;
    }
  }
  .o-link-icon .o-icon {
    height: 13px;
  }
  .o-link-icon:hover {
    cursor: pointer;
    color: #000;
  }
`;

interface LinkDisplayProps {
  cellPosition: Position;
}

export class LinkDisplay extends Component<LinkDisplayProps, SpreadsheetChildEnv> {
  static components = { Menu };
  static template = "o-spreadsheet-LinkDisplay";

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

  openLink() {
    openLink(this.link, this.env);
  }

  edit() {
    const { col, row } = this.props.cellPosition;
    this.env.model.dispatch("OPEN_CELL_POPOVER", {
      col,
      row,
      popoverType: "LinkEditor",
    });
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
    if (!shouldDisplayLink) return { isOpen: false };
    return {
      isOpen: true,
      Component: LinkDisplay,
      props: { cellPosition: position },
      cellCorner: "BottomLeft",
    };
  },
};

LinkDisplay.props = {
  cellPosition: Object,
  onClosed: { type: Function, optional: true },
};
