import { Component } from "@odoo/owl";
import { deepEquals, positionToZone } from "../../helpers";
import { _t } from "../../translation";
import { CellPosition, CellValueType, EvaluatedCell, SpreadsheetChildEnv } from "../../types";
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
    box-sizing: border-box !important;
    overflow-wrap: break-word;

    .o-error-tooltip-message {
      overflow: hidden;
    }
  }
`;

export interface ErrorToolTipMessage {
  title: string;
  message: string;
}

interface ErrorToolTipProps {
  cellPosition: CellPosition;
  errors: ErrorToolTipMessage[];
  onClosed?: () => void;
}

export class ErrorToolTip extends Component<ErrorToolTipProps, SpreadsheetChildEnv> {
  static maxSize = { maxHeight: ERROR_TOOLTIP_MAX_HEIGHT };
  static template = "o-spreadsheet-ErrorToolTip";
  static props = {
    cellPosition: Object,
    errors: Array,
    onClosed: { type: Function, optional: true },
  };

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
    const errors: ErrorToolTipMessage[] = [];
    let evaluationError: EvaluatedCell | undefined;
    if (cell.type === CellValueType.error && !!cell.message) {
      evaluationError = cell;
    }

    const validationErrorMessage = getters.getInvalidDataValidationMessage(position);
    if (validationErrorMessage) {
      errors.push({
        title: _t("Invalid"),
        message: validationErrorMessage,
      });
    }

    if (!errors.length && !evaluationError) {
      return { isOpen: false };
    }

    return {
      isOpen: true,
      props: {
        cellPosition: position,
        errors,
      },
      Component: ErrorToolTip,
      cellCorner: "TopRight",
    };
  },
};
