import { Component } from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import { positionToZone } from "../../helpers";
import { ConsecutiveIndexes, HeaderIndex, SpreadsheetChildEnv } from "../../types";
import { cssPropertiesToCss } from "../helpers";

interface Props {
  headersGroups: ConsecutiveIndexes[];
  offset: number;
}

export class UnhideRowHeaders extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-UnhideRowHeaders";
  static props = {
    headersGroups: Array,
    offset: { type: Number, optional: true },
  };
  static defaultProps = { offset: 0 };

  get sheetId() {
    return this.env.model.getters.getActiveSheetId();
  }

  get viewportZone() {
    return this.env.model.getters.getActiveMainViewport();
  }

  getUnhideButtonStyle(hiddenIndex: HeaderIndex): string {
    const y =
      this.env.model.getters.getRect(positionToZone({ col: 0, row: hiddenIndex })).y -
      HEADER_HEIGHT;
    console.log("y", y);
    return cssPropertiesToCss({ top: y - this.props.offset + "px", "margin-right": "1px" });
  }

  unhide(hiddenElements: HeaderIndex[]) {
    this.env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: this.sheetId,
      dimension: "ROW",
      elements: hiddenElements,
    });
  }
}

export class UnhideColumnHeaders extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-UnhideColumnHeaders";
  static props = {
    headersGroups: Array,
    offset: { type: Number, optional: true },
  };
  static defaultProps = { offset: 0 };

  get sheetId() {
    return this.env.model.getters.getActiveSheetId();
  }

  get viewportZone() {
    return this.env.model.getters.getActiveMainViewport();
  }

  getUnhideButtonStyle(hiddenIndex: HeaderIndex): string {
    const x =
      this.env.model.getters.getRect(positionToZone({ col: hiddenIndex, row: 0 })).x - HEADER_WIDTH;
    return cssPropertiesToCss({ left: x - this.props.offset + "px" });
  }

  unhide(hiddenElements: HeaderIndex[]) {
    this.env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: this.sheetId,
      dimension: "COL",
      elements: hiddenElements,
    });
  }
}
