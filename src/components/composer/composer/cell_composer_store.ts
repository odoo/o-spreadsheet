import { prettify } from "@odoo/o-spreadsheet-engine/formulas/formula_formatter";
import {
  isMultipleElementMatrix,
  toScalar,
} from "@odoo/o-spreadsheet-engine/functions/helper_matrices";
import { parseLiteral } from "@odoo/o-spreadsheet-engine/helpers/cells/cell_evaluation";
import { getDateTimeFormat, localizeFormula } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import {
  detectDateFormat,
  formatValue,
  isDateTimeFormat,
  isFormula,
  markdownLink,
  numberToString,
  parseDateTime,
  positionToZone,
  toXC,
  updateSelectionOnDeletion,
  updateSelectionOnInsertion,
} from "../../../helpers/index";
import {
  AddColumnsRowsCommand,
  CellPosition,
  CellValueType,
  Command,
  CommandResult,
  Direction,
  DispatchResult,
  Format,
  FormulaCell,
  Locale,
  RemoveColumnsRowsCommand,
  isMatrix,
} from "../../../types";
import { moveAnchorWithinSelection } from "../../helpers/selection_helpers";
import { AbstractComposerStore, ComposerSelection } from "./abstract_composer_store";

const CELL_DELETED_MESSAGE = _t("The cell you are trying to edit has been deleted.");

export class CellComposerStore extends AbstractComposerStore {
  private canStopEdition(): boolean {
    if (this.editionMode === "inactive") {
      return true;
    }
    return this.checkDataValidation();
  }

  stopEdition(direction?: Direction) {
    const canStopEdition = this.canStopEdition();
    if (canStopEdition) {
      this._stopEdition();
      if (direction) {
        if (this.getters.isSingleCellOrMerge(this.sheetId, this.getters.getSelectedZone())) {
          this.model.selection.moveAnchorCell(direction, 1);
        } else {
          moveAnchorWithinSelection(this.getters, this.model.selection, direction);
        }
      }
      return;
    }
    const editedCell = this.currentEditedCell;
    const cellXc = toXC(editedCell.col, editedCell.row);

    const rule = this.getters.getValidationRuleForCell(editedCell);
    if (!rule) {
      return;
    }

    const evaluator = criterionEvaluatorRegistry.get(rule.criterion.type);
    const errorStr = evaluator.getErrorString(rule.criterion, this.getters, editedCell.sheetId);
    this.notificationStore.raiseError(
      _t(
        "The data you entered in %s violates the data validation rule set on the cell:\n%s",
        cellXc,
        errorStr
      )
    );
    this.cancelEdition();
  }

  handle(cmd: Command) {
    super.handle(cmd);
    switch (cmd.type) {
      case "SET_FORMATTING":
        this.cancelEdition();
        break;
      case "ADD_COLUMNS_ROWS":
        this.onAddElements(cmd);
        break;
      case "REMOVE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.onColumnsRemoved(cmd);
        } else {
          this.onRowsRemoved(cmd);
        }
        break;
      case "ACTIVATE_SHEET":
        if (!isFormula(this._currentContent)) {
          this._cancelEdition();
          this.resetContent();
        }
        if (cmd.sheetIdFrom !== cmd.sheetIdTo) {
          const activePosition = this.getters.getActivePosition();
          const { col, row } = this.getters.getNextVisibleCellPosition({
            sheetId: cmd.sheetIdTo,
            col: activePosition.col,
            row: activePosition.row,
          });
          const zone = this.getters.expandZone(cmd.sheetIdTo, positionToZone({ col, row }));
          this.model.selection.resetAnchor(this, { cell: { col, row }, zone });
        }
        break;
      case "DELETE_SHEET":
      case "UNDO":
      case "REDO":
        const sheetIdExists = !!this.getters.tryGetSheet(this.sheetId);
        if (!sheetIdExists && this.editionMode !== "inactive") {
          this.sheetId = this.getters.getActiveSheetId();
          this.resetContent();
          this.cancelEditionAndActivateSheet();
          this.notificationStore.raiseError(CELL_DELETED_MESSAGE);
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get placeholder(): string | undefined {
    const position = this.getters.getActivePosition();
    const spreader = this.model.getters.getArrayFormulaSpreadingOn(position);
    if (!spreader) {
      return undefined;
    }
    return this.getters.getCellText(spreader, { showFormula: true });
  }

  get currentEditedCell(): CellPosition {
    return {
      sheetId: this.sheetId,
      col: this.col,
      row: this.row,
    };
  }

  private onColumnsRemoved(cmd: RemoveColumnsRowsCommand) {
    if (cmd.elements.includes(this.col) && this.editionMode !== "inactive") {
      this.cancelEdition();
      this.notificationStore.raiseError(CELL_DELETED_MESSAGE);
      return;
    }
    const { top, left } = updateSelectionOnDeletion(
      { left: this.col, right: this.col, top: this.row, bottom: this.row },
      "left",
      [...cmd.elements]
    );
    this.col = left;
    this.row = top;
  }

  private onRowsRemoved(cmd: RemoveColumnsRowsCommand) {
    if (cmd.elements.includes(this.row) && this.editionMode !== "inactive") {
      this.cancelEdition();
      this.notificationStore.raiseError(CELL_DELETED_MESSAGE);
      return;
    }
    const { top, left } = updateSelectionOnDeletion(
      { left: this.col, right: this.col, top: this.row, bottom: this.row },
      "top",
      [...cmd.elements]
    );
    this.col = left;
    this.row = top;
  }

  private onAddElements(cmd: AddColumnsRowsCommand) {
    const { top, left } = updateSelectionOnInsertion(
      { left: this.col, right: this.col, top: this.row, bottom: this.row },
      cmd.dimension === "COL" ? "left" : "top",
      cmd.base,
      cmd.position,
      cmd.quantity
    );
    this.col = left;
    this.row = top;
  }

  protected confirmEdition(content: string) {
    let result: DispatchResult;
    if (content) {
      const sheetId = this.getters.getActiveSheetId();
      const position = { sheetId, col: this.col, row: this.row };
      const cell = this.getters.getEvaluatedCell(position);
      if (cell.link && !isFormula(content)) {
        content = markdownLink(content, cell.link.url);
      }
      const currentFormat = this.getters.getCell(position)?.format;
      const afterFormat =
        currentFormat === "@" || (currentFormat && isDateTimeFormat(currentFormat))
          ? undefined
          : detectDateFormat(content, this.getters.getLocale());
      this.addHeadersForSpreadingFormula(content);
      result = this.model.dispatch("UPDATE_CELL", {
        ...this.currentEditedCell,
        content,
        format: afterFormat,
      });
    } else {
      result = this.model.dispatch("UPDATE_CELL", {
        ...this.currentEditedCell,
        content: "",
      });
    }
    if (result.isSuccessful) {
      this.model.dispatch("AUTOFILL_TABLE_COLUMN", { ...this.currentEditedCell });
    }
    this.setContent("");
  }

  protected getComposerContent(
    position: CellPosition,
    selection?: ComposerSelection
  ): { text: string; adjustedSelection?: ComposerSelection } {
    const locale = this.getters.getLocale();
    const cell = this.getters.getCell(position);
    if (cell?.isFormula) {
      const prettifiedContent = this.getPrettifiedFormula(cell);
      // when a formula is prettified (multi lines, indented), adapt the cursor position
      // to take into account line breaks and tabs
      function adjustCursorIndex(targetIndex: number): number {
        let adjustedIndex = 0;
        let originalIndex = 0;
        while (originalIndex < targetIndex) {
          adjustedIndex++;
          const char = prettifiedContent[adjustedIndex];
          if (char !== "\n" && char !== "\t") {
            originalIndex++;
          }
        }
        return adjustedIndex;
      }
      let adjustedSelection = selection;
      if (selection) {
        adjustedSelection = {
          start: adjustCursorIndex(selection.start),
          end: adjustCursorIndex(selection.end),
        };
      }
      return {
        text: localizeFormula(prettifiedContent, locale),
        adjustedSelection,
      };
    }
    const spreader = this.model.getters.getArrayFormulaSpreadingOn(position);
    if (spreader) {
      return { text: "" };
    }
    if (cell?.content.startsWith("'")) {
      return { text: cell.content };
    }
    const { format, value, type, formattedValue } = this.getters.getEvaluatedCell(position);
    switch (type) {
      case CellValueType.empty:
        return { text: "" };
      case CellValueType.text:
      case CellValueType.error:
        return { text: value };
      case CellValueType.boolean:
        return { text: formattedValue };
      case CellValueType.number:
        if (format && isDateTimeFormat(format)) {
          if (parseDateTime(formattedValue, locale) !== null) {
            // formatted string can be parsed again
            return { text: formattedValue };
          }
          // display a simplified and parsable string otherwise
          const timeFormat = Number.isInteger(value)
            ? locale.dateFormat
            : getDateTimeFormat(locale);
          return { text: formatValue(value, { locale, format: timeFormat }) };
        }
        return { text: this.numberComposerContent(value, format, locale) };
    }
  }

  private getPrettifiedFormula(cell: FormulaCell): string {
    if (cell.compiledFormula.isBadExpression) {
      return cell.compiledFormula.toFormulaString(this.getters);
    }
    const width =
      this.editionMode === "inactive"
        ? Infinity // one liner
        : 80;
    const ast = cell.compiledFormula.getAst(this.getters);
    return prettify(ast, width);
  }

  private numberComposerContent(value: number, format: Format | undefined, locale: Locale): string {
    if (format?.includes("%")) {
      return `${numberToString(value * 100, locale.decimalSeparator)}%`;
    }
    return numberToString(value, locale.decimalSeparator);
  }

  /** Add headers at the end of the sheet so the formula in the composer has enough space to spread */
  private addHeadersForSpreadingFormula(content: string) {
    if (!isFormula(content)) {
      return;
    }

    const evaluated = this.getters.evaluateFormula(this.sheetId, content);
    if (!isMatrix(evaluated)) {
      return;
    }

    const numberOfRows = this.getters.getNumberRows(this.sheetId);
    const numberOfCols = this.getters.getNumberCols(this.sheetId);

    const missingRows = this.row + evaluated[0].length - numberOfRows;
    const missingCols = this.col + evaluated.length - numberOfCols;

    if (missingCols > 0) {
      this.model.dispatch("ADD_COLUMNS_ROWS", {
        sheetId: this.sheetId,
        sheetName: this.getters.getSheetName(this.sheetId),
        dimension: "COL",
        base: numberOfCols - 1,
        position: "after",
        quantity: missingCols + 20,
      });
    }
    if (missingRows > 0) {
      this.model.dispatch("ADD_COLUMNS_ROWS", {
        sheetId: this.sheetId,
        sheetName: this.getters.getSheetName(this.sheetId),
        dimension: "ROW",
        base: numberOfRows - 1,
        position: "after",
        quantity: missingRows + 50,
      });
    }
  }

  private checkDataValidation(): boolean {
    const cellPosition = { sheetId: this.sheetId, col: this.col, row: this.row };
    const content = this.getCurrentCanonicalContent();
    const cellValue = isFormula(content)
      ? this.getters.evaluateFormula(this.sheetId, content)
      : parseLiteral(content, this.getters.getLocale());

    if (isMultipleElementMatrix(cellValue)) {
      return true;
    }

    const validationResult = this.getters.getValidationResultForCellValue(
      toScalar(cellValue),
      cellPosition
    );
    if (!validationResult.isValid && validationResult.rule.isBlocking) {
      return false;
    }
    return true;
  }

  startEdition(text?: string, selection?: ComposerSelection) {
    if (this.getters.isCurrentSheetLocked()) {
      this.model.trigger("command-rejected", {
        result: new DispatchResult(CommandResult.SheetLocked),
        command: { sheetId: this.getters.getActiveSheetId() },
      });
      return "NoStateChange";
    }
    return super.startEdition(text, selection);
  }
}
