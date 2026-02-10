import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { SELECTION_BORDER_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps } from "@odoo/owl";
import {
  deepEquals,
  fontSizeInPixels,
  getFullReference,
  isFormula,
  positionToZone,
  toXC,
} from "../../../helpers";
import { Store, useStore } from "../../../store_engine";
import { CellPosition, ComposerFocusType, DOMDimension, Rect } from "../../../types/index";
import { getTextDecoration } from "../../helpers";
import { CellComposerStore } from "../composer/cell_composer_store";
import { CellComposerProps, Composer } from "../composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer_focus_store";

const COMPOSER_BORDER_WIDTH = 3 * 0.4 * window.devicePixelRatio || 1;
const GRID_CELL_REFERENCE_TOP_OFFSET = 28;

interface Props {
  gridDims: DOMDimension;
  onInputContextMenu: (event: MouseEvent) => void;
}

/**
 * This component is a composer which positions itself on the grid at the anchor cell.
 * It also applies the style of the cell to the composer input.
 */
export class GridComposer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridComposer";
  static props = {
    gridDims: Object,
    onInputContextMenu: Function,
  };
  static components = { Composer };

  private rect: Rect = this.defaultRect;
  private isEditing: boolean = false;
  private isCellReferenceVisible: boolean = false;
  private currentEditedCell: CellPosition = {
    col: 0,
    row: 0,
    sheetId: this.env.model.getters.getActiveSheetId(),
  };

  private composerStore!: Store<CellComposerStore>;
  composerFocusStore!: Store<ComposerFocusStore>;

  private composerInterface!: ComposerInterface;

  get defaultRect() {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  setup() {
    const composerStore = useStore(CellComposerStore);
    this.composerStore = composerStore;
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.composerInterface = {
      id: "gridComposer",
      get editionMode() {
        return composerStore.editionMode;
      },
      startEdition: this.composerStore.startEdition,
      setCurrentContent: this.composerStore.setCurrentContent,
      stopEdition: this.composerStore.stopEdition,
    };
    this.composerFocusStore.focusComposer(this.composerInterface, { focusMode: "inactive" });
    onWillUpdateProps(() => {
      this.updateComponentPosition();
      this.updateCellReferenceVisibility();
    });
  }

  get shouldDisplayCellReference(): boolean {
    return !this.env.isMobile() && this.isCellReferenceVisible;
  }

  get cellReference(): string {
    const { col, row, sheetId } = this.composerStore.currentEditedCell;
    const prefixSheet = sheetId !== this.env.model.getters.getActiveSheetId();
    return getFullReference(
      prefixSheet ? this.env.model.getters.getSheetName(sheetId) : undefined,
      toXC(col, row)
    );
  }

  get cellReferenceStyle(): string {
    const { x: left, y: top } = this.rect;
    return cssPropertiesToCss({
      left: `${left - COMPOSER_BORDER_WIDTH}px`,
      top: `${top - GRID_CELL_REFERENCE_TOP_OFFSET}px`,
    });
  }

  get focus(): ComposerFocusType {
    return this.composerFocusStore.activeComposer === this.composerInterface
      ? this.composerFocusStore.focusMode
      : "inactive";
  }

  get composerProps(): CellComposerProps {
    const { width, height } = this.env.model.getters.getSheetViewDimensionWithHeaders();
    // Remove the wrapper border width
    const maxHeight = this.props.gridDims.height - this.rect.y - 2 * COMPOSER_BORDER_WIDTH;
    return {
      rect: { ...this.rect },
      delimitation: {
        width,
        height,
      },
      focus: this.focus,
      isDefaultFocus: true,
      onComposerContentFocused: (selection) =>
        this.composerFocusStore.focusComposer(this.composerInterface, {
          focusMode: "contentFocus",
          selection,
        }),
      onComposerCellFocused: (content: string) =>
        this.composerFocusStore.focusComposer(this.composerInterface, {
          focusMode: "cellFocus",
          content,
        }),
      onInputContextMenu: this.props.onInputContextMenu,
      composerStore: this.composerStore,
      inputStyle: `max-height: ${maxHeight}px;`,
      inputMode: this.composerStore.editionMode === "inactive" ? "none" : undefined,
    };
  }

  get containerStyle(): string {
    if (this.composerStore.editionMode === "inactive" || this.env.isMobile()) {
      return `z-index: -1000; opacity: 0;`; // opacity 0 for safari on ios
    }
    const _isFormula = isFormula(this.composerStore.currentContent);
    const cell = this.env.model.getters.getActiveCell();
    const position = this.env.model.getters.getActivePosition();
    const style = this.env.model.getters.getCellComputedStyle(position);

    // position style
    const { x: left, y: top, width, height } = this.rect;

    // color style
    const background = (!_isFormula && style.fillColor) || "#ffffff";
    const color = (!_isFormula && style.textColor) || "#000000";

    // font style
    const fontSize = (!_isFormula && style.fontSize) || 10;
    const fontWeight = !_isFormula && style.bold ? "bold" : undefined;
    const fontStyle = !_isFormula && style.italic ? "italic" : "normal";
    const textDecoration = !_isFormula ? getTextDecoration(style) : "none";

    // align style
    let textAlign = "left";

    if (!_isFormula) {
      if (style.align === "default" || !style.align) {
        textAlign = cell.defaultAlign;
      } else {
        textAlign = style.align;
      }
    }

    const maxHeight = this.props.gridDims.height - this.rect.y;
    const maxWidth = this.props.gridDims.width - this.rect.x;

    /**
     * min-size is on the container, not the composer element, because we want to have the same size as the cell by default,
     * including all the paddings/margins of the composer
     *
     * The +-1 are there to include cell borders in the composer sizing/positioning
     */
    const minHeight = Math.min(height + 1, maxHeight);
    const minWidth = Math.min(width + 1, maxWidth);
    return cssPropertiesToCss({
      left: `${left - 1}px`,
      top: `${top}px`,
      border: `${COMPOSER_BORDER_WIDTH}px solid ${SELECTION_BORDER_COLOR}`,

      "min-width": `${minWidth}px`,
      "min-height": `${minHeight}px`,
      "max-width": `${maxWidth}px`,
      "max-height": `${maxHeight}px`,

      background,
      color,
      "font-size": `${fontSizeInPixels(fontSize)}px`,
      "font-weight": fontWeight,
      "font-style": fontStyle,
      "text-decoration": textDecoration,
      "text-align": textAlign,
    });
  }

  private updateComponentPosition() {
    const isEditing = this.composerFocusStore.activeComposer.editionMode !== "inactive";
    if (!isEditing && this.composerFocusStore.activeComposer !== this.composerInterface) {
      this.composerFocusStore.focusComposer(this.composerInterface, { focusMode: "inactive" });
    }

    let shouldRecomputeRect = !deepEquals(
      this.currentEditedCell,
      this.composerStore.currentEditedCell
    );

    if (this.isEditing !== isEditing) {
      this.isEditing = isEditing;
      if (!isEditing) {
        this.rect = this.defaultRect;
        return;
      }
      this.currentEditedCell = this.composerStore.currentEditedCell;
      shouldRecomputeRect = true;
    }

    if (shouldRecomputeRect) {
      const position = this.env.model.getters.getActivePosition();
      const zone = this.env.model.getters.expandZone(position.sheetId, positionToZone(position));
      this.rect = this.env.model.getters.getVisibleRect(zone);
    }
  }

  private updateCellReferenceVisibility() {
    if (this.composerStore.editionMode === "inactive") {
      this.isCellReferenceVisible = false;
      return;
    }
    if (this.isCellReferenceVisible) {
      return;
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zone = positionToZone(this.env.model.getters.getSelection().anchor.cell);
    const rect = this.env.model.getters.getVisibleRect(zone);
    if (!deepEquals(rect, this.rect) || sheetId !== this.composerStore.currentEditedCell.sheetId) {
      this.isCellReferenceVisible = true;
    }
  }

  onFocus() {
    this.composerFocusStore.focusComposer(this.composerInterface, { focusMode: "contentFocus" });
  }
}
