import { useProps } from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import { positionToZone } from "../../helpers/zones";
import { HeaderIndex } from "../../types/misc";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../helpers/css";
import { types } from "../props_validation";

import { Component } from "../../owl3_compatibility_layer";

export class UnhideRowHeaders extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-UnhideRowHeaders";

  protected props = useProps({
    headersGroups: types.array(),
    headerRange: types.object({
      start: types.HeaderIndex(),
      end: types.HeaderIndex(),
    }),
    offset: types.number().optional(0),
  });

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

export class UnhideColumnHeaders extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-UnhideColumnHeaders";

  protected props = useProps({
    headersGroups: types.array(),
    headerRange: types.object({
      start: types.HeaderIndex(),
      end: types.HeaderIndex(),
    }),
    offset: types.number().optional(0),
  });

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
