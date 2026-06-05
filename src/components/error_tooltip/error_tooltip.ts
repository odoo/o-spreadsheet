import { deepEquals, getMissingHeadersForSpreadResult } from "../../helpers/misc";
import { positionToZone } from "../../helpers/zones";
import { _t } from "../../translation";
import { CellPopoverComponent, PopoverBuilders } from "../../types/cell_popovers";
import { CellValueType } from "../../types/cells";
import { CellErrorType } from "../../types/errors";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

import { props } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useModel } from "../owl_plugins/model_plugin";
import { types } from "../props_validation";
const ERROR_TOOLTIP_MAX_HEIGHT = 80;

export class ErrorToolTip extends Component<SpreadsheetChildEnv> {
  static maxSize = { maxHeight: ERROR_TOOLTIP_MAX_HEIGHT };
  static template = "o-spreadsheet-ErrorToolTip";

  protected props = props({
    cellPosition: types.CellPosition(),
    "onClosed?": types.function([]),
  });

  private model = useModel();

  get dataValidationErrorMessage() {
    return this.model().getters.getInvalidDataValidationMessage(this.props.cellPosition);
  }

  get evaluationError() {
    const cell = this.model().getters.getEvaluatedCell(this.props.cellPosition);
    if (cell.message) {
      return cell;
    }
    return undefined;
  }

  get errorOriginPositionString() {
    if (this.model().getters.isDashboard()) {
      return "";
    }
    const evaluationError = this.evaluationError;
    const position = evaluationError?.errorOriginPosition;
    if (!position || deepEquals(position, this.props.cellPosition)) {
      return "";
    }
    const sheetId = position.sheetId;
    return this.model().getters.getRangeString(
      this.model().getters.getRangeFromZone(sheetId, positionToZone(position)),
      this.model().getters.getActiveSheetId()
    );
  }

  selectCell() {
    const position = this.evaluationError?.errorOriginPosition;
    if (!position) {
      return;
    }
    const activeSheetId = this.model().getters.getActiveSheetId();
    if (position.sheetId !== activeSheetId) {
      this.model().dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: activeSheetId,
        sheetIdTo: position.sheetId,
      });
    }
    this.model().selection.selectCell(position.col, position.row);
  }

  get isSpillErrorBecauseOfMissingHeaders() {
    const evaluationError = this.evaluationError;
    return (
      evaluationError?.value === CellErrorType.SpilledBlocked &&
      !evaluationError.errorOriginPosition &&
      !this.model().getters.getSpreadZone(this.props.cellPosition, { ignoreSpillError: true })
    );
  }

  getMissingHeadersForSpread() {
    if (!this.isSpillErrorBecauseOfMissingHeaders) {
      return;
    }
    const cell = this.model().getters.getCell(this.props.cellPosition);
    if (!cell || !cell.isFormula) {
      return;
    }
    const formula = cell.compiledFormula.toFormulaString(this.model().getters);
    return getMissingHeadersForSpreadResult(this.model().getters, this.props.cellPosition, formula);
  }

  addMissingHeaders({ missingCols, missingRows }: { missingCols: number; missingRows: number }) {
    const sheetId = this.props.cellPosition.sheetId;
    if (missingCols > 0) {
      this.model().dispatch("ADD_COLUMNS_ROWS", {
        sheetId,
        sheetName: this.model().getters.getSheetName(sheetId),
        dimension: "COL",
        base: this.model().getters.getNumberCols(sheetId) - 1,
        position: "after",
        quantity: missingCols + 20,
      });
    }
    if (missingRows > 0) {
      this.model().dispatch("ADD_COLUMNS_ROWS", {
        sheetId,
        sheetName: this.model().getters.getSheetName(sheetId),
        dimension: "ROW",
        base: this.model().getters.getNumberRows(sheetId) - 1,
        position: "after",
        quantity: missingRows + 50,
      });
    }
  }

  getAddMissingHeadersButtonText(missingHeaders: { missingCols: number; missingRows: number }) {
    if (missingHeaders.missingCols > 0 && missingHeaders.missingRows > 0) {
      return _t("Add missing columns and rows");
    } else if (missingHeaders.missingCols > 0) {
      return _t("Add missing columns");
    } else {
      return _t("Add missing rows");
    }
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
        cellCorner: "top-right",
      };
    }
    return { isOpen: false };
  },
};
