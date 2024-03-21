import { Component, onMounted, onPatched, useRef, useState } from "@odoo/owl";
import { ComponentsImportance, DEFAULT_FONT, SELECTION_BORDER_COLOR } from "../../../constants";
import { EnrichedToken } from "../../../formulas/index";
import { functionRegistry } from "../../../functions/index";
import { isEqual, rangeReference, splitReference, zoneToDimension } from "../../../helpers/index";
import { SelectionIndicator } from "../../../plugins/ui/edition";
import {
  Color,
  DOMDimension,
  FunctionDescription,
  Rect,
  SpreadsheetChildEnv,
} from "../../../types/index";
import { css } from "../../helpers/css";
import {
  TextValueProvider,
  TextValueProviderApi,
} from "../autocomplete_dropdown/autocomplete_dropdown";
import { ContentEditableHelper } from "../content_editable_helper";
import { FunctionDescriptionProvider } from "../formula_assistant/formula_assistant";

const functions = functionRegistry.content;

const ASSISTANT_WIDTH = 300;

const FunctionColor = "#4a4e4d";
const OperatorColor = "#3da4ab";
const StringColor = "#00a82d";
const SelectionIndicatorColor = "darkgrey";
export const NumberColor = "#02c39a";
export const MatchingParenColor = "black";

export const SelectionIndicatorClass = "selector-flag";

export type HtmlContent = {
  value: string;
  color?: Color;
  class?: string;
};

export const tokenColor = {
  OPERATOR: OperatorColor,
  NUMBER: NumberColor,
  STRING: StringColor,
  FUNCTION: FunctionColor,
  DEBUGGER: OperatorColor,
  LEFT_PAREN: FunctionColor,
  RIGHT_PAREN: FunctionColor,
  COMMA: FunctionColor,
};

css/* scss */ `
  .o-composer-container {
    padding: 0;
    margin: 0;
    border: 0;
    flex-grow: 1;
    max-height: inherit;
    .o-composer {
      font-family: ${DEFAULT_FONT};
      caret-color: black;
      padding-left: 3px;
      padding-right: 3px;
      word-break: break-all;
      &:focus {
        outline: none;
      }
      &.unfocusable {
        pointer-events: none;
      }
      span {
        white-space: pre;
        &.${SelectionIndicatorClass}:after {
          content: "${SelectionIndicator}";
          color: ${SelectionIndicatorColor};
        }
      }
    }
    .o-composer-assistant {
      position: absolute;
      margin: 4px;
      pointer-events: none;
    }
  }

  /* Custom css to highlight topbar composer on focus */
  .o-topbar-toolbar .o-composer-container:focus-within {
    border: 1px solid ${SELECTION_BORDER_COLOR};
  }

  .o-topbar-toolbar .o-composer-container {
    z-index: ${ComponentsImportance.TopBarComposer};
  }
`;

export interface ComposerProps {
  inputStyle: string;
  rect?: Rect;
  delimitation?: DOMDimension;
  focus: "inactive" | "cellFocus" | "contentFocus";
  onComposerContentFocused: () => void;
  onComposerCellFocused?: (content: String) => void;
  onInputContextMenu?: (event: MouseEvent) => void;
  isDefaultFocus?: boolean;
}

interface ComposerState {
  positionStart: number;
  positionEnd: number;
}

interface AutoCompleteState {
  showProvider: boolean;
  provider: string;
  search: string;
}

interface FunctionDescriptionState {
  showDescription: boolean;
  functionName: string;
  functionDescription: FunctionDescription;
  argToFocus: number;
}

export class Composer extends Component<ComposerProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Composer";
  static components = { TextValueProvider, FunctionDescriptionProvider };
  static defaultProps = {
    inputStyle: "",
    focus: "inactive",
    isDefaultFocus: false,
  };

  composerRef = useRef("o_composer");
  private autocompleteAPI?: TextValueProviderApi;

  contentHelper: ContentEditableHelper = new ContentEditableHelper(this.composerRef.el!);

  composerState: ComposerState = useState({
    positionStart: 0,
    positionEnd: 0,
  });

  autoCompleteState: AutoCompleteState = useState({
    showProvider: false,
    provider: "functions",
    search: "",
  });

  functionDescriptionState: FunctionDescriptionState = useState({
    showDescription: false,
    functionName: "",
    functionDescription: {} as FunctionDescription,
    argToFocus: 0,
  });
  private isKeyStillDown: boolean = false;
  private compositionActive: boolean = false;

  get assistantStyle(): string {
    if (this.props.delimitation && this.props.rect) {
      const { x: cellX, y: cellY, height: cellHeight } = this.props.rect;
      const remainingHeight = this.props.delimitation.height - (cellY + cellHeight);
      let assistantStyle = "";
      if (cellY > remainingHeight) {
        // render top
        assistantStyle += `
          top: -8px;
          transform: translate(0, -100%);
        `;
      }
      if (cellX + ASSISTANT_WIDTH > this.props.delimitation.width) {
        // render left
        assistantStyle += `right:0px;`;
      }
      return (assistantStyle += `width:${ASSISTANT_WIDTH}px;`);
    }
    return `width:${ASSISTANT_WIDTH}px;`;
  }

  borderStyle = `box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);`;

  // we can't allow input events to be triggered while we remove and add back the content of the composer in processContent
  shouldProcessInputEvents: boolean = false;
  tokens: EnrichedToken[] = [];

  keyMapping: { [key: string]: Function } = {
    ArrowUp: this.processArrowKeys,
    ArrowDown: this.processArrowKeys,
    ArrowLeft: this.processArrowKeys,
    ArrowRight: this.processArrowKeys,
    Enter: this.processEnterKey,
    Escape: this.processEscapeKey,
    F2: () => console.warn("Not implemented"),
    F4: this.processF4Key,
    Tab: (ev: KeyboardEvent) => this.processTabKey(ev),
  };

  setup() {
    onMounted(() => {
      const el = this.composerRef.el!;
      if (this.props.isDefaultFocus) {
        this.env.focusableElement.setFocusableElement(el);
      }
      this.contentHelper.updateEl(el);
      this.processContent();
    });

    onPatched(() => {
      if (!this.isKeyStillDown) {
        this.processContent();
      }

      // Required because typing '=SUM' and double-clicking another cell leaves ShowProvider and ShowDescription true
      if (this.env.model.getters.getEditionMode() === "inactive") {
        this.processTokenAtCursor();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  private processArrowKeys(ev: KeyboardEvent) {
    if (
      this.env.model.getters.isSelectingForComposer() ||
      this.env.model.getters.getEditionMode() === "inactive"
    ) {
      this.functionDescriptionState.showDescription = false;
      // Prevent the default content editable behavior which moves the cursor
      // but don't stop the event and let it bubble to the grid which will
      // update the selection accordingly
      ev.preventDefault();
      return;
    }
    const content = this.env.model.getters.getCurrentContent();
    if (
      this.props.focus === "cellFocus" &&
      !this.autoCompleteState.showProvider &&
      !content.startsWith("=")
    ) {
      this.env.model.dispatch("STOP_EDITION");
      return;
    }
    ev.stopPropagation();
    // only for arrow up and down
    if (
      ["ArrowUp", "ArrowDown"].includes(ev.key) &&
      this.autoCompleteState.showProvider &&
      this.autocompleteAPI
    ) {
      ev.preventDefault();
      if (ev.key === "ArrowUp") {
        this.autocompleteAPI.moveUp();
      } else {
        this.autocompleteAPI.moveDown();
      }
    }
    this.updateCursorIfNeeded();
  }

  private processTabKey(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.env.model.getters.getEditionMode() !== "inactive") {
      if (this.autoCompleteState.showProvider && this.autocompleteAPI) {
        const autoCompleteValue = this.autocompleteAPI.getValueToFill();
        if (autoCompleteValue) {
          this.autoComplete(autoCompleteValue);
          return;
        }
      } else {
        // when completing with tab, if there is no value to complete, the active cell will be moved to the right.
        // we can't let the model think that it is for a ref selection.
        // todo: check if this can be removed someday
        this.env.model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
      }
      this.env.model.dispatch("STOP_EDITION");
    }
    const direction = ev.shiftKey ? "left" : "right";
    this.env.model.selection.moveAnchorCell(direction, 1);
  }

  private processEnterKey(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.isKeyStillDown = false;
    if (this.autoCompleteState.showProvider && this.autocompleteAPI) {
      const autoCompleteValue = this.autocompleteAPI.getValueToFill();
      if (autoCompleteValue) {
        this.autoComplete(autoCompleteValue);
        return;
      }
    }
    this.env.model.dispatch("STOP_EDITION");
    const direction = ev.shiftKey ? "up" : "down";
    this.env.model.selection.moveAnchorCell(direction, 1);
  }

  private processEscapeKey() {
    this.env.model.dispatch("STOP_EDITION", { cancel: true });
  }

  private processF4Key() {
    this.env.model.dispatch("CYCLE_EDITION_REFERENCES");
    this.processContent();
  }

  onCompositionStart() {
    this.compositionActive = true;
  }
  onCompositionEnd() {
    this.compositionActive = false;
  }

  onKeydown(ev: KeyboardEvent) {
    if (this.env.model.getters.getEditionMode() === "inactive") {
      return;
    }
    let handler = this.keyMapping[ev.key];
    if (handler) {
      handler.call(this, ev);
    } else {
      ev.stopPropagation();
      this.updateCursorIfNeeded();
    }
  }

  private updateCursorIfNeeded() {
    const moveCursor =
      !this.env.model.getters.isSelectingForComposer() &&
      !(this.env.model.getters.getEditionMode() === "inactive");
    if (moveCursor) {
      const { start, end } = this.contentHelper.getCurrentSelection();
      this.env.model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start, end });
      this.isKeyStillDown = true;
    }
  }

  onPaste(ev: ClipboardEvent) {
    if (this.env.model.getters.getEditionMode() !== "inactive") {
      ev.stopPropagation();
    }
  }

  /*
   * Triggered automatically by the content-editable between the keydown and key up
   * */
  onInput(ev: InputEvent) {
    if (!this.shouldProcessInputEvents) {
      return;
    }
    if (
      ev.inputType === "insertFromPaste" &&
      this.env.model.getters.getEditionMode() === "inactive"
    ) {
      return;
    }
    ev.stopPropagation();
    let content: string;

    if (this.env.model.getters.getEditionMode() === "inactive") {
      content = ev.data || "";
    } else {
      const el = this.composerRef.el! as HTMLInputElement;
      content = el.childNodes.length ? el.textContent! : "";
    }
    if (this.props.focus === "inactive") {
      return this.props.onComposerCellFocused?.(content);
    }
    this.env.model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    this.env.model.dispatch("SET_CURRENT_CONTENT", {
      content,
      selection: this.contentHelper.getCurrentSelection(),
    });
  }

  onKeyup(ev: KeyboardEvent) {
    this.isKeyStillDown = false;
    if (
      this.props.focus === "inactive" ||
      ["Control", "Shift", "Tab", "Enter", "F4"].includes(ev.key)
    ) {
      return;
    }

    if (this.autoCompleteState.showProvider && ["ArrowUp", "ArrowDown"].includes(ev.key)) {
      return; // already processed in keydown
    }

    if (
      this.env.model.getters.isSelectingForComposer() &&
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.key)
    ) {
      return; // already processed in keydown
    }

    ev.preventDefault();
    ev.stopPropagation();
    this.autoCompleteState.showProvider = false;
    if (ev.ctrlKey && ev.key === " ") {
      this.autoCompleteState.search = "";
      this.autoCompleteState.showProvider = true;
      this.env.model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
      return;
    }

    const { start: oldStart, end: oldEnd } = this.env.model.getters.getComposerSelection();
    const { start, end } = this.contentHelper.getCurrentSelection();

    if (start !== oldStart || end !== oldEnd) {
      this.env.model.dispatch(
        "CHANGE_COMPOSER_CURSOR_SELECTION",
        this.contentHelper.getCurrentSelection()
      );
    }

    this.processTokenAtCursor();
    this.processContent();
  }

  onMousedown(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    this.contentHelper.removeSelection();
  }

  onClick() {
    if (this.env.model.getters.isReadonly()) {
      return;
    }
    const newSelection = this.contentHelper.getCurrentSelection();

    this.env.model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    this.props.onComposerContentFocused();
    if (this.props.focus === "inactive") {
    }
    this.env.model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", newSelection);
    this.processTokenAtCursor();
  }

  onBlur() {
    this.isKeyStillDown = false;
  }

  onCompleted(text: string | undefined) {
    text && this.autoComplete(text);
  }

  onContextMenu(ev: MouseEvent) {
    if (this.env.model.getters.getEditionMode() === "inactive") {
      this.props.onInputContextMenu?.(ev);
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private processContent() {
    if (this.compositionActive) {
      return;
    }
    this.contentHelper.removeAll(); // removes the content of the composer, to be added just after
    this.shouldProcessInputEvents = false;

    if (this.props.focus !== "inactive") {
      this.contentHelper.el.focus();
      this.contentHelper.selectRange(0, 0); // move the cursor inside the composer at 0 0.
    }
    const content = this.getContent();
    if (content.length !== 0) {
      this.contentHelper.setText(content);
      const { start, end } = this.env.model.getters.getComposerSelection();

      if (this.props.focus !== "inactive") {
        // Put the cursor back where it was before the rendering
        this.contentHelper.selectRange(start, end);
      }
    }

    this.shouldProcessInputEvents = true;
  }

  private getContent(): HtmlContent[] {
    let content: HtmlContent[];
    const value = this.env.model.getters.getCurrentContent();
    const isValidFormula =
      value.startsWith("=") && this.env.model.getters.getCurrentTokens().length > 0;
    if (value === "") {
      content = [];
    } else if (isValidFormula && this.props.focus !== "inactive") {
      content = this.getColoredTokens();
    } else {
      content = [{ value }];
    }
    return content;
  }

  private getColoredTokens(): any[] {
    const tokens = this.env.model.getters.getCurrentTokens();
    const tokenAtCursor = this.env.model.getters.getTokenAtCursor();
    const result: any[] = [];
    const { start, end } = this.env.model.getters.getComposerSelection();
    for (const token of tokens) {
      switch (token.type) {
        case "OPERATOR":
        case "NUMBER":
        case "FUNCTION":
        case "COMMA":
        case "STRING":
          result.push({ value: token.value, color: tokenColor[token.type] || "#000" });
          break;
        case "REFERENCE":
          const { xc, sheetName } = splitReference(token.value);
          result.push({ value: token.value, color: this.rangeColor(xc, sheetName) || "#000" });
          break;
        case "SYMBOL":
          let value = token.value;
          if (["TRUE", "FALSE"].includes(value.toUpperCase())) {
            result.push({ value: token.value, color: NumberColor });
          } else {
            result.push({ value: token.value, color: "#000" });
          }
          break;
        case "LEFT_PAREN":
        case "RIGHT_PAREN":
          // Compute the matching parenthesis
          if (
            tokenAtCursor &&
            ["LEFT_PAREN", "RIGHT_PAREN"].includes(tokenAtCursor.type) &&
            tokenAtCursor.parenIndex &&
            tokenAtCursor.parenIndex === token.parenIndex
          ) {
            result.push({ value: token.value, color: MatchingParenColor || "#000" });
          } else {
            result.push({ value: token.value, color: tokenColor[token.type] || "#000" });
          }
          break;
        default:
          result.push({ value: token.value, color: "#000" });
          break;
      }
      if (this.env.model.getters.showSelectionIndicator() && end === start && end === token.end) {
        result[result.length - 1].class = SelectionIndicatorClass;
      }
    }
    return result;
  }

  private rangeColor(xc: string, sheetName?: string): Color | undefined {
    if (this.props.focus === "inactive") {
      return undefined;
    }
    const highlights = this.env.model.getters.getHighlights();
    const refSheet = sheetName
      ? this.env.model.getters.getSheetIdByName(sheetName)
      : this.env.model.getters.getEditionSheet();

    const highlight = highlights.find((highlight) => {
      if (highlight.sheetId !== refSheet) return false;

      const range = this.env.model.getters.getRangeFromSheetXC(refSheet, xc);
      let zone = range.zone;
      const { height, width } = zoneToDimension(zone);
      zone = height * width === 1 ? this.env.model.getters.expandZone(refSheet, zone) : zone;
      return isEqual(zone, highlight.zone);
    });
    return highlight && highlight.color ? highlight.color : undefined;
  }

  /**
   * Compute the state of the composer from the tokenAtCursor.
   * If the token is a function or symbol (that isn't a cell/range reference) we have to initialize
   * the autocomplete engine otherwise we initialize the formula assistant.
   */
  private processTokenAtCursor(): void {
    let content = this.env.model.getters.getCurrentContent();
    this.autoCompleteState.showProvider = false;
    this.functionDescriptionState.showDescription = false;

    if (content.startsWith("=")) {
      const tokenAtCursor = this.env.model.getters.getTokenAtCursor();
      if (tokenAtCursor) {
        const { xc } = splitReference(tokenAtCursor.value);
        if (
          tokenAtCursor.type === "FUNCTION" ||
          (tokenAtCursor.type === "SYMBOL" && !rangeReference.test(xc))
        ) {
          // initialize Autocomplete Dropdown
          this.autoCompleteState.search = tokenAtCursor.value;
          this.autoCompleteState.showProvider = true;
        } else if (tokenAtCursor.functionContext && tokenAtCursor.type !== "UNKNOWN") {
          // initialize Formula Assistant
          const tokenContext = tokenAtCursor.functionContext;
          const parentFunction = tokenContext.parent.toUpperCase();
          const description = functions[parentFunction];
          const argPosition = tokenContext.argPosition;

          this.functionDescriptionState.functionName = parentFunction;
          this.functionDescriptionState.functionDescription = description;
          this.functionDescriptionState.argToFocus = description.getArgToFocus(argPosition + 1) - 1;
          this.functionDescriptionState.showDescription = true;
        }
      }
    }
  }

  private autoComplete(value: string) {
    if (value) {
      const tokenAtCursor = this.env.model.getters.getTokenAtCursor();
      if (tokenAtCursor) {
        let start = tokenAtCursor.end;
        let end = tokenAtCursor.end;

        // shouldn't it be REFERENCE ?
        if (["SYMBOL", "FUNCTION"].includes(tokenAtCursor.type)) {
          start = tokenAtCursor.start;
        }

        const tokens = this.env.model.getters.getCurrentTokens();
        if (this.autoCompleteState.provider && tokens.length) {
          value += "(";

          const currentTokenIndex = tokens.map((token) => token.start).indexOf(tokenAtCursor.start);
          if (currentTokenIndex + 1 < tokens.length) {
            const nextToken = tokens[currentTokenIndex + 1];
            if (nextToken.type === "LEFT_PAREN") {
              end++;
            }
          }
        }

        this.env.model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
          start,
          end,
        });
      }

      this.env.model.dispatch("REPLACE_COMPOSER_CURSOR_SELECTION", {
        text: value,
      });
    }
    this.processTokenAtCursor();
  }
}
