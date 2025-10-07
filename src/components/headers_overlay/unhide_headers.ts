import { HEADER_HEIGHT, HEADER_WIDTH } from "@odoo/o-spreadsheet-engine/constants";
import { Component } from "@odoo/owl";
import { positionToZone } from "../../helpers";
import { ConsecutiveIndexes, HeaderIndex } from "../../types";
import { SpreadsheetChildEnv } from "../../types/spreadsheetChildEnv";
import { cssPropertiesToCss } from "../helpers";

interface Props {
  headersGroups: ConsecutiveIndexes[];
  offset: number;
  headerRange: { start: HeaderIndex; end: HeaderIndex };
}

export class UnhideRowHeaders extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-UnhideRowHeaders";
  static props = {
    headersGroups: Array,
    headerRange: Object,
    offset: { type: Number, optional: true },
  };
  static defaultProps = { offset: 0 };

  get sheetId() {
    return this.env.model.getters.getActiveSheetId();
  }

  getUnhidePreviousButtonStyle(hiddenIndex: HeaderIndex): string {
    const rect = this.env.model.getters.getRect(positionToZone({ col: 0, row: hiddenIndex }));
    const y = rect.y + rect.height - HEADER_HEIGHT;
    return cssPropertiesToCss({ top: y - this.props.offset + "px", "margin-right": "1px" });
  }

  getUnhideNextButtonStyle(hiddenIndex: HeaderIndex): string {
    const rect = this.env.model.getters.getRect(positionToZone({ col: 0, row: hiddenIndex }));
    const y = rect.y - HEADER_HEIGHT;
    return cssPropertiesToCss({ top: y - this.props.offset + "px", "margin-right": "1px" });
  }

  unhide(hiddenElements: HeaderIndex[]) {
    this.env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: this.sheetId,
      dimension: "ROW",
      elements: hiddenElements,
    });
  }

  isVisible(header: HeaderIndex) {
    return header >= this.props.headerRange.start && header <= this.props.headerRange.end;
  }
}

export class UnhideColumnHeaders extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-UnhideColumnHeaders";
  static props = {
    headersGroups: Array,
    headerRange: Object,
    offset: { type: Number, optional: true },
  };
  static defaultProps = { offset: 0 };

  get sheetId() {
    return this.env.model.getters.getActiveSheetId();
  }

  getUnhidePreviousButtonStyle(hiddenIndex: HeaderIndex): string {
    const rect = this.env.model.getters.getRect(positionToZone({ col: hiddenIndex, row: 0 }));
    const x = rect.x + rect.width - HEADER_WIDTH;
    return cssPropertiesToCss({ left: x - this.props.offset + "px" });
  }

  getUnhideNextButtonStyle(hiddenIndex: HeaderIndex): string {
    const rect = this.env.model.getters.getRect(positionToZone({ col: hiddenIndex, row: 0 }));
    const x = rect.x - HEADER_WIDTH;
    return cssPropertiesToCss({ left: x - this.props.offset + "px" });
  }

  unhide(hiddenElements: HeaderIndex[]) {
    this.env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: this.sheetId,
      dimension: "COL",
      elements: hiddenElements,
    });
  }

  isVisible(header: HeaderIndex) {
    return header >= this.props.headerRange.start && header <= this.props.headerRange.end;
  }
}
