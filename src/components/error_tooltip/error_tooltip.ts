import { Component } from "@odoo/owl";
import { deepEquals, positionToZone } from "../../helpers";
import { CellPosition, CellValueType, SpreadsheetChildEnv } from "../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../types/cell_popovers";
import { css } from "../helpers/css";

const ERROR_TOOLTIP_MAX_HEIGHT = 80;
const ERROR_TOOLTIP_WIDTH = 180;

css/* scss */ `
  .o-error-tooltip {
    font-size: 13px;
    background-color: white;
    border-left: 3px solid red;
    padding: 10px;
    width: ${ERROR_TOOLTIP_WIDTH}px;
    overflow-wrap: break-word;

    .o-error-tooltip-message {
      overflow: hidden;
    }
  }
`;

interface ErrorToolTipProps {
  cellPosition: CellPosition;
  onClosed?: () => void;
}

export class ErrorToolTip extends Component<ErrorToolTipProps, SpreadsheetChildEnv> {
  static maxSize = { maxHeight: ERROR_TOOLTIP_MAX_HEIGHT };
  static template = "o-spreadsheet-ErrorToolTip";
  static props = {
    cellPosition: Object,
    onClosed: { type: Function, optional: true },
  };

  get dataValidationErrorMessage() {
    return this.env.model.getters.getInvalidDataValidationMessage(this.props.cellPosition);
  }

  get evaluationError() {
    const cell = this.env.model.getters.getEvaluatedCell(this.props.cellPosition);
    if (cell.message) {
      return cell;
    }
    return undefined;
  }

  get errorOriginPositionString() {
    const evaluationError = this.evaluationError;
    const position = evaluationError?.errorOriginPosition;
    if (!position || deepEquals(position, this.props.cellPosition)) {
      return "";
    }
    const sheetId = position.sheetId;
    return this.env.model.getters.getRangeString(
      this.env.model.getters.getRangeFromZone(sheetId, positionToZone(position)),
      this.env.model.getters.getActiveSheetId()
    );
  }

  selectCell() {
    const position = this.evaluationError?.errorOriginPosition;
    if (!position) {
      return;
    }
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    if (position.sheetId !== activeSheetId) {
      this.env.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: activeSheetId,
        sheetIdTo: position.sheetId,
      });
    }
    this.env.model.selection.selectCell(position.col, position.row);
  }
}

export const ErrorToolTipPopoverBuilder: PopoverBuilders = {
  onHover: (position, getters): CellPopoverComponent<typeof ErrorToolTip> => {
    const cell = getters.getEvaluatedCell(position);
    if (
      (cell.type === CellValueType.error && !!cell.message) ||
      getters.getInvalidDataValidationMessage(position)
    ) {
      return {
        isOpen: true,
        props: {
          cellPosition: position,
        },
        Component: ErrorToolTip,
        cellCorner: "TopRight",
      };
    }
    return { isOpen: false };
  },
};
