import { Component } from "@odoo/owl";
import { LINK_COLOR } from "../../../constants";
import { toXC } from "../../../helpers";
import { LinkCell, Position, SpreadsheetChildEnv } from "../../../types";
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
    padding: 12px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;

    img {
      margin-right: 3px;
      width: 16px;
      height: 16px;
    }

    a.o-link {
      color: #007bff;
      flex-grow: 2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    a.o-link:hover {
      text-decoration: underline;
      color: #0056b3;
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
  .o-link-icon.o-unlink .o-icon {
    padding-top: 1px;
    height: 14px;
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

  get cell(): LinkCell {
    const { col, row } = this.props.cellPosition;
    const sheetId = this.env.model.getters.getActiveSheetId();
    const cell = this.env.model.getters.getCell(sheetId, col, row);
    if (cell?.isLink()) {
      return cell;
    }
    throw new Error(
      `LinkDisplay Component can only be used with link cells. ${toXC(col, row)} is not a link.`
    );
  }

  openLink() {
    this.cell.action(this.env);
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
    const style = this.cell.style;
    const textColor = style?.textColor === LINK_COLOR ? undefined : style?.textColor;
    this.env.model.dispatch("UPDATE_CELL", {
      col,
      row,
      sheetId,
      content: this.cell.link.label,
      style: { ...style, textColor, underline: undefined },
    });
  }
}

export const LinkCellPopoverBuilder: PopoverBuilders = {
  onHover: (position, getters): CellPopoverComponent<typeof LinkDisplay> => {
    const cell = getters.getCell(getters.getActiveSheetId(), position.col, position.row);
    const shouldDisplayLink =
      cell?.isLink() &&
      getters.isVisibleInViewport(position.col, position.row, getters.getActiveViewport());
    if (!shouldDisplayLink) return { isOpen: false };
    return {
      isOpen: true,
      Component: LinkDisplay,
      props: { cellPosition: position },
      cellCorner: "BottomLeft",
    };
  },
};
