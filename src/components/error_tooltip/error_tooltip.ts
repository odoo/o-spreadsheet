import { Component } from "@odoo/owl";
import { _t } from "../../translation";
import { CellValueType } from "../../types";
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
  errors: ErrorToolTipMessage[];
  onClosed?: () => void;
}

export class ErrorToolTip extends Component<ErrorToolTipProps> {
  static maxSize = { maxHeight: ERROR_TOOLTIP_MAX_HEIGHT };
  static template = "o-spreadsheet-ErrorToolTip";
}

ErrorToolTip.props = {
  errors: Array,
  onClosed: { type: Function, optional: true },
};

export const ErrorToolTipPopoverBuilder: PopoverBuilders = {
  onHover: (position, getters): CellPopoverComponent<typeof ErrorToolTip> => {
    const cell = getters.getEvaluatedCell(position);
    const errors: ErrorToolTipMessage[] = [];
    if (cell.type === CellValueType.error && !!cell.message) {
      errors.push({
        title: _t("Error"),
        message: cell.message,
      });
    }

    const validationErrorMessage = getters.getInvalidDataValidationMessage(position);
    if (validationErrorMessage) {
      errors.push({
        title: _t("Invalid"),
        message: validationErrorMessage,
      });
    }

    if (!errors.length) {
      return { isOpen: false };
    }

    return {
      isOpen: true,
      props: { errors: errors },
      Component: ErrorToolTip,
      cellCorner: "TopRight",
    };
  },
};
