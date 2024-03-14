import { Component } from "@odoo/owl";
import { Action } from "../../actions/action";
import {
  ComponentsImportance,
  GROUP_LAYER_WIDTH,
  HEADER_GROUPING_BORDER_COLOR,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../constants";
import { interactiveToggleGroup } from "../../helpers/ui/toggle_group_interactive";
import { getHeaderGroupContextMenu } from "../../registries/menus/header_group_registry";
import { DOMCoordinates, Dimension, HeaderGroup, Rect } from "../../types";
import { SpreadsheetChildEnv } from "../../types/env";
import { css, cssPropertiesToCss } from "../helpers";

interface Props {
  group: HeaderGroup;
  layerOffset: number;
  openContextMenu(position: DOMCoordinates, menuItems: Action[]): void;
}

interface GroupBox {
  groupRect: Rect;
  headerRect: Rect;
  isEndHidden: boolean;
}

css/* scss */ `
  .o-header-group {
    .o-header-group-header {
      z-index: ${ComponentsImportance.HeaderGroupingButton};
      .o-group-fold-button {
        cursor: pointer;
        width: 13px;
        height: 13px;
        border: 1px solid ${HEADER_GROUPING_BORDER_COLOR};
        .o-icon {
          width: 7px;
          height: 7px;
        }

        &:hover {
          border-color: #777777;
        }
      }
    }
    .o-group-border {
      box-sizing: border-box;
    }
  }
`;

abstract class AbstractHeaderGroup extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeaderGroup";
  static props = {
    group: Object,
    layerOffset: Number,
    openContextMenu: Function,
  };

  abstract dimension: Dimension;

  toggleGroup() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const { start, end } = this.props.group;
    interactiveToggleGroup(this.env, sheetId, this.dimension, start, end);
  }

  get groupBoxStyle(): string {
    const groupBox = this.groupBox;
    return cssPropertiesToCss({
      top: `${groupBox.groupRect.y}px`,
      left: `${groupBox.groupRect.x}px`,
      width: `${groupBox.groupRect.width}px`,
      height: `${groupBox.groupRect.height}px`,
    });
  }
  abstract get groupBorderStyle(): string;
  abstract get groupHeaderStyle(): string;

  get groupButtonStyle(): string {
    return cssPropertiesToCss({
      "background-color": this.isGroupFolded ? "#333333" : "#FFFFFF",
      color: this.isGroupFolded ? "#FFFFFF" : "#333333",
    });
  }

  get groupButtonIcon(): string {
    return this.isGroupFolded ? "o-spreadsheet-Icon.PLUS" : "o-spreadsheet-Icon.MINUS";
  }

  get isGroupFolded(): boolean {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const group = this.props.group;
    return this.env.model.getters.isGroupFolded(sheetId, this.dimension, group.start, group.end);
  }

  /** The box that will be used to draw the header group. */
  abstract get groupBox(): GroupBox;

  onContextMenu(ev: MouseEvent) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const position = { x: ev.clientX, y: ev.clientY };
    const group = this.props.group;
    const menuItems = getHeaderGroupContextMenu(sheetId, this.dimension, group.start, group.end);

    this.props.openContextMenu(position, menuItems);
  }
}

export class RowGroup extends AbstractHeaderGroup {
  dimension: Dimension = "ROW";

  get groupBorderStyle(): string {
    const groupBox = this.groupBox;
    if (this.groupBox.groupRect.height === 0) {
      return "";
    }
    return cssPropertiesToCss({
      top: `${groupBox.headerRect.height / 2}px`,
      left: `calc(50% - 1px)`, // -1px: we want the border to be on the center
      width: `30%`,
      height: `calc(100% - ${groupBox.headerRect.height / 2}px)`,
      "border-left": `1px solid ${HEADER_GROUPING_BORDER_COLOR}`,
      "border-bottom": groupBox.isEndHidden ? "" : `1px solid ${HEADER_GROUPING_BORDER_COLOR}`,
    });
  }

  get groupHeaderStyle(): string {
    return cssPropertiesToCss({
      width: `100%`,
      height: `${this.groupBox.headerRect.height}px`,
    });
  }

  get groupBox(): GroupBox {
    const sheetId = this.env.model.getters.getActiveSheetId();

    const { start: startRow, end: endRow } = this.props.group;
    const startCoordinates = this.env.model.getters.getRowDimensions(sheetId, startRow).start;
    const endCoordinates = this.env.model.getters.getRowDimensions(sheetId, endRow).end;

    let groupHeaderY: number = 0;
    let groupHeaderHeight = HEADER_HEIGHT;
    if (startRow !== 0) {
      const headerRowDims = this.env.model.getters.getRowDimensions(sheetId, startRow - 1);
      groupHeaderY = HEADER_HEIGHT + headerRowDims.start;
      groupHeaderHeight = headerRowDims.end - headerRowDims.start;
    }
    const headerRect = {
      x: this.props.layerOffset,
      y: groupHeaderY,
      width: GROUP_LAYER_WIDTH,
      height: groupHeaderHeight,
    };

    const groupRect: Rect = {
      x: this.props.layerOffset,
      y: headerRect.y,
      width: GROUP_LAYER_WIDTH,
      height: headerRect.height + (endCoordinates - startCoordinates),
    };

    return {
      headerRect,
      groupRect,
      isEndHidden: this.env.model.getters.isRowHidden(sheetId, endRow),
    };
  }
}

export class ColGroup extends AbstractHeaderGroup {
  dimension: Dimension = "COL";

  get groupBorderStyle(): string {
    const groupBox = this.groupBox;
    if (groupBox.groupRect.width === 0) {
      return "";
    }
    return cssPropertiesToCss({
      top: `calc(50% - 1px)`, // -1px: we want the border to be on the center
      left: `${groupBox.headerRect.width / 2}px`,
      width: `calc(100% - ${groupBox.headerRect.width / 2}px)`,
      height: `30%`,
      "border-top": `1px solid ${HEADER_GROUPING_BORDER_COLOR}`,
      "border-right": groupBox.isEndHidden ? "" : `1px solid ${HEADER_GROUPING_BORDER_COLOR}`,
    });
  }

  get groupHeaderStyle(): string {
    return cssPropertiesToCss({
      width: `${this.groupBox.headerRect.width}px`,
      height: `100%`,
    });
  }

  get groupBox(): GroupBox {
    const sheetId = this.env.model.getters.getActiveSheetId();

    const { start: startCol, end: endCol } = this.props.group;
    const startCoordinates = this.env.model.getters.getColDimensions(sheetId, startCol).start;
    const endCoordinates = this.env.model.getters.getColDimensions(sheetId, endCol).end;

    let groupHeaderX = 0;
    let groupHeaderWidth: number = HEADER_WIDTH;
    if (startCol !== 0) {
      const headerRowDims = this.env.model.getters.getColDimensions(sheetId, startCol - 1);
      groupHeaderX = HEADER_WIDTH + headerRowDims.start;
      groupHeaderWidth = headerRowDims.end - headerRowDims.start;
    }
    const headerRect: Rect = {
      x: groupHeaderX,
      y: this.props.layerOffset,
      width: groupHeaderWidth,
      height: GROUP_LAYER_WIDTH,
    };

    const groupRect: Rect = {
      x: headerRect.x,
      y: this.props.layerOffset,
      width: headerRect.width + (endCoordinates - startCoordinates),
      height: GROUP_LAYER_WIDTH,
    };

    return {
      headerRect,
      groupRect,
      isEndHidden: this.env.model.getters.isColHidden(sheetId, endCol),
    };
  }
}
