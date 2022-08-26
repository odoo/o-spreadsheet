import { Component } from "@odoo/owl";
import { LINK_COLOR } from "../../../constants";
import { toXC } from "../../../helpers";
import { openLink } from "../../../helpers/cells/link_factory";
import { Cell, Link, Position, SpreadsheetChildEnv } from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { css } from "../../helpers/css";
import { Menu } from "../../menu/menu";

const LINK_TOOLTIP_HEIGHT = 43;
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
    padding-left: 4%;
    .o-icon {
      height: 16px;
    }
  }
  .o-link-icon .o-icon {
    padding-top: 3px;
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
  static size = { width: LINK_TOOLTIP_WIDTH, height: LINK_TOOLTIP_HEIGHT };

  get cell(): Cell | undefined {
    const { col, row } = this.props.cellPosition;
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getCell(sheetId, col, row);
  }

  get link(): Link {
    if (this.cell?.link) {
      return this.cell.link;
    }
    const { col, row } = this.props.cellPosition;
    throw new Error(
      `LinkDisplay Component can only be used with link cells. ${toXC(col, row)} is not a link.`
    );
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
    const style = this.cell?.style;
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
    const sheetId = getters.getActiveSheetId();
    const cell = getters.getCell(sheetId, position.col, position.row);
    const shouldDisplayLink =
      !getters.isDashboard() &&
      cell?.link &&
      getters.isVisibleInViewport(sheetId, position.col, position.row);
    if (!shouldDisplayLink) return { isOpen: false };
    return {
      isOpen: true,
      Component: LinkDisplay,
      props: { cellPosition: position },
      cellCorner: "BottomLeft",
    };
  },
};
