import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { Color } from "chart.js";
import * as ACTION_FORMAT from "../../../actions/format_actions";
import { setStyle } from "../../../actions/menu_items_actions";
import {
  ComponentsImportance,
  DEFAULT_FONT,
  GRAY_300,
  SELECTION_BORDER_COLOR,
} from "../../../constants";
import {
  deepEquals,
  fontSizeInPixels,
  getFullReference,
  getZoneArea,
  positionToZone,
  toXC,
} from "../../../helpers";
import { Store, useStore } from "../../../store_engine";
import { SelectionStore } from "../../../stores/draw_selection_store";
import { ComposerFocusType, DOMDimension, Rect, SpreadsheetChildEnv } from "../../../types/index";
import { ActionButton } from "../../action_button/action_button";
import { ColorPickerWidget } from "../../color_picker/color_picker_widget";
import { getTextDecoration } from "../../helpers";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { Popover, PopoverProps } from "../../popover";
import { CellComposerStore } from "../composer/cell_composer_store";
import { CellComposerProps, Composer } from "../composer/composer";
import { ComposerFocusStore, ComposerInterface } from "../composer_focus_store";

const COMPOSER_BORDER_WIDTH = 3 * 0.4 * window.devicePixelRatio || 1;
const GRID_CELL_REFERENCE_TOP_OFFSET = 28;

css/* scss */ `
  div.o-grid-composer {
    z-index: ${ComponentsImportance.GridComposer};
    box-sizing: border-box;
    position: absolute;
    border: ${COMPOSER_BORDER_WIDTH}px solid ${SELECTION_BORDER_COLOR};
    font-family: ${DEFAULT_FONT};

    display: flex;
    align-items: center;
  }

  div.o-cell-reference {
    position: absolute;
    z-index: ${ComponentsImportance.GridComposer};
    background: ${SELECTION_BORDER_COLOR};
    color: white;
    font-size: 12px;
    line-height: 14px;
    padding: 6px 7px;
    border-radius: 4px;
  }

  .mobile-edition {
    background-color: white;
  }

  /*  shoult be more global and not copied from top bar */
  .o-divider {
    border-right: 1px solid ${GRAY_300};
    margin: 0 6px;
  }

  .o-color-picker {
    width: 100% !important;
  }
`;

interface Props {
  gridDims: DOMDimension;
  onInputContextMenu: (event: MouseEvent) => void;
}

/**
 * This component is a composer which positions itself on the grid at the anchor cell.
 * It also applies the style of the cell to the composer input.
 */
export class GridComposer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-mobile-GridComposer";
  static props = {
    gridDims: Object,
    onInputContextMenu: Function,
  };
  static components = { Composer, Popover, ActionButton, ColorPickerWidget };
  FORMAT = ACTION_FORMAT;

  private rect: Rect = this.defaultRect;
  private isEditing: boolean = false;
  private isCellReferenceVisible: boolean = false;

  private composerStore!: Store<CellComposerStore>;
  composerFocusStore!: Store<ComposerFocusStore>;

  private composerInterface!: ComposerInterface;
  selectionStore!: Store<SelectionStore>;

  state = useState({
    menuState: { isOpen: false, position: null, menuItems: [] },
    activeTool: "",
    fillColor: "#ffffff",
    textColor: "#000000",
  });

  get defaultRect() {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  setup() {
    const composerStore = useStore(CellComposerStore);
    this.composerStore = composerStore;
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.selectionStore = useStore(SelectionStore);
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

  get isComposerVisible(): boolean {
    return (
      this.env.model.getters.getSelectedZones().length === 1 &&
      getZoneArea(this.env.model.getters.getSelectedZone()) === 1
    );
  }

  get shouldDisplayCellReference(): boolean {
    return this.isCellReferenceVisible;
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

  get popoverProps(): PopoverProps {
    return {
      // TODO: make sure that we use this.rect when we are actually editing ...
      anchorRect: { x: 0, y: 0, width: 10000, height: 10000 },
      // this.composerStore.editionMode !== "inactive"
      //   ? { x: 0, y: 0, width: 10000, height: 10000 }
      //   : { x: -1, y: -1, width: -1, height: -1 },
      positioning: "TopRight",
      verticalOffset: 0,
    };
  }

  get composerProps(): CellComposerProps {
    const { width, height } = this.env.model.getters.getSheetViewDimensionWithHeaders();
    const props = {
      rect: { ...this.rect },
      delimitation: {
        width,
        height,
      },
      focus: this.focus,
      isDefaultFocus: false,
      onComposerContentFocused: () =>
        this.composerFocusStore.focusComposer(this.composerInterface, {
          focusMode: "contentFocus",
        }),
      onComposerCellFocused: (content: string) =>
        this.composerFocusStore.focusComposer(this.composerInterface, {
          focusMode: "cellFocus",
          content,
        }),
      onInputContextMenu: this.props.onInputContextMenu,
      composerStore: this.composerStore,
    };

    if (true) {
      // if is mobile
      Object.assign(props, {
        inputStyle: cssPropertiesToCss({
          border: `lightgrey solid 1px`,
          "border-radius": "5px",
          "line-height": "24px",
        }),
      });
    }

    return props;
  }

  get containerStyle(): string {
    if (this.composerStore.editionMode === "inactive") {
      return `z-index: -1000;`;
    }
    const isFormula = this.composerStore.currentContent.startsWith("=");
    const cell = this.env.model.getters.getActiveCell();
    const position = this.env.model.getters.getActivePosition();
    const style = this.env.model.getters.getCellComputedStyle(position);

    // position style

    // color style
    const background = (!isFormula && style.fillColor) || "#ffffff";
    const color = (!isFormula && style.textColor) || "#000000";

    // font style
    const fontSize = (!isFormula && style.fontSize) || 10;
    const fontWeight = !isFormula && style.bold ? "bold" : undefined;
    const fontStyle = !isFormula && style.italic ? "italic" : "normal";
    const textDecoration = !isFormula ? getTextDecoration(style) : "none";

    // align style
    let textAlign = "left";

    if (!isFormula) {
      textAlign = style.align || cell.defaultAlign;
    }

    /**
     * min-size is on the container, not the composer element, because we want to have the same size as the cell by default,
     * including all the paddings/margins of the composer
     *
     * The +-1 are there to include cell borders in the composer sizing/positioning
     */
    return cssPropertiesToCss({
      // left: `${left - 1}px`,
      // top: `${top}px`,

      // "min-width": `${width + 1}px`,
      // "min-height": `${height + 1}px`,
      // "max-width": `${maxWidth}px`,
      // "max-height": `${maxHeight}px`,
      "margin-top": `auto`,
      width: "100%",
      height: "fit-content",
      background,
      color,
      "font-size": `${fontSizeInPixels(fontSize)}px`,
      "font-weight": fontWeight,
      "font-style": fontStyle,
      "text-decoration": textDecoration,
      "text-align": textAlign,
      bottom: "0",
      position: "absolute",
    });
  }

  private updateComponentPosition() {
    const isEditing = this.composerFocusStore.activeComposer.editionMode !== "inactive";
    if (!isEditing && this.composerFocusStore.activeComposer !== this.composerInterface) {
      this.composerFocusStore.focusComposer(this.composerInterface, { focusMode: "inactive" });
    }

    if (this.isEditing !== isEditing) {
      this.isEditing = isEditing;
      // if (!isEditing) {
      //   this.rect = this.defaultRect;
      //   return;
      // }
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

  setColor(target: string, color: Color) {
    setStyle(this.env, { [target]: color });
    this.state.activeTool = "";
    // this.onClick();
  }
}
