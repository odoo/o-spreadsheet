import { Component } from "@odoo/owl";
import { CellValueType } from "../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../types/cell_popovers";
import { CellErrorLevel } from "../../types/errors";
import { css } from "../helpers/css";

const ERROR_TOOLTIP_HEIGHT = 40;
const ERROR_TOOLTIP_WIDTH = 180;

css/* scss */ `
  .o-error-tooltip {
    font-size: 13px;
    background-color: white;
    border-left: 3px solid red;
    padding: 10px;
  }
`;

interface ErrorToolTipProps {
  text: string;
  onClosed?: () => void;
}

class ErrorToolTip extends Component<ErrorToolTipProps> {
  static size = { width: ERROR_TOOLTIP_WIDTH, height: ERROR_TOOLTIP_HEIGHT };
  static template = "o-spreadsheet-ErrorToolTip";
  static components = {};
}

ErrorToolTip.props = {
  text: String,
  onClosed: { type: Function, optional: true },
};

export const ErrorToolTipPopoverBuilder: PopoverBuilders = {
  onHover: (position, getters): CellPopoverComponent<typeof ErrorToolTip> => {
    const cell = getters.getEvaluatedCell(position);
    if (cell.type === CellValueType.error && cell.error.logLevel > CellErrorLevel.silent) {
      return {
        isOpen: true,
        props: { text: cell.error.message },
        Component: ErrorToolTip,
        cellCorner: "TopRight",
      };
    }
    return { isOpen: false };
  },
};
