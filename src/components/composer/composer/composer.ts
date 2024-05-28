import { Component, onMounted, onPatched, useEffect, useRef, useState } from "@odoo/owl";
import { DEFAULT_FONT, NEWLINE } from "../../../constants";
import { EnrichedToken } from "../../../formulas/index";
import { functionRegistry } from "../../../functions/index";
import { fuzzyLookup, getZoneArea, isEqual, splitReference } from "../../../helpers/index";

import {
  Color,
  CSSProperties,
  DOMDimension,
  FunctionDescription,
  Rect,
  SpreadsheetChildEnv,
} from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { updateSelectionWithArrowKeys } from "../../helpers/selection_helpers";
import { ComposerFocusType } from "../../spreadsheet/spreadsheet";
import { TextValueProvider } from "../autocomplete_dropdown/autocomplete_dropdown";
import { ContentEditableHelper } from "../content_editable_helper";
import { FunctionDescriptionProvider } from "../formula_assistant/formula_assistant";

const functions = functionRegistry.content;

const ASSISTANT_WIDTH = 300;

export const selectionIndicatorClass = "selector-flag";
const selectionIndicatorColor = "#a9a9a9";
const selectionIndicator = "␣";

export type HtmlContent = {
  value: string;
  color?: Color;
  class?: string;
};

const functionColor = "#4a4e4d";
const operatorColor = "#3da4ab";

export const tokenColors = {
  OPERATOR: operatorColor,
  NUMBER: "#02c39a",
  STRING: "#00a82d",
  FUNCTION: functionColor,
  DEBUGGER: operatorColor,
  LEFT_PAREN: functionColor,
  RIGHT_PAREN: functionColor,
  ARG_SEPARATOR: functionColor,
  MATCHING_PAREN: "#000000",
};

css/* scss */ `
  .o-composer-container {
    .o-composer {
      overflow-y: auto;
      overflow-x: hidden;
      word-break: break-all;
      padding-right: 2px;

      box-sizing: border-box;
      font-family: ${DEFAULT_FONT};

      caret-color: black;
      padding-left: 3px;
      padding-right: 3px;
      outline: none;

      p {
        margin-bottom: 0px;

        span {
          white-space: pre-wrap;
          &.${selectionIndicatorClass}:after {
            content: "${selectionIndicator}";
            color: ${selectionIndicatorColor};
          }
        }
      }
    }

    .o-composer-assistant {
      position: absolute;
      margin: 1px 4px;
      pointer-events: none;
    }
  }
`;

export interface AutocompleteValue {
  text: string;
  description: string;
}

export interface ComposerProps {
  focus: ComposerFocusType;
  inputStyle?: string;
  rect?: Rect;
  delimitation?: DOMDimension;
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
  selectedIndex: number;
  values: AutocompleteValue[];
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
    isDefaultFocus: false,
  };

  composerRef = useRef("o_composer");

  contentHelper: ContentEditableHelper = new ContentEditableHelper(this.composerRef.el!);

  composerState: ComposerState = useState({
    positionStart: 0,
    positionEnd: 0,
  });

  autoCompleteState: AutoCompleteState = useState({
    showProvider: false,
    values: [],
    selectedIndex: 0,
  });

  functionDescriptionState: FunctionDescriptionState = useState({
    showDescription: false,
    functionName: "",
    functionDescription: {} as FunctionDescription,
    argToFocus: 0,
  });
  private compositionActive: boolean = false;

  get assistantStyle(): string {
    if (this.props.delimitation && this.props.rect) {
      const { x: cellX, y: cellY, height: cellHeight } = this.props.rect;
      const remainingHeight = this.props.delimitation.height - (cellY + cellHeight);
      let assistantStyle: CSSProperties = {};
      if (cellY > remainingHeight) {
        // render top
        // We compensate 2 px of margin on the assistant style + 1px for design reasons
        assistantStyle.top = `-3px`;
        assistantStyle.transform = `translate(0, -100%)`;
      }
      if (cellX + ASSISTANT_WIDTH > this.props.delimitation.width) {
        // render left
        assistantStyle.right = `0px`;
      }
      assistantStyle.width = `${ASSISTANT_WIDTH}px`;
      return cssPropertiesToCss(assistantStyle);
    }
    return cssPropertiesToCss({ width: `${ASSISTANT_WIDTH}px` });
  }

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
    F4: (ev: KeyboardEvent) => this.processF4Key(ev),
    Tab: (ev: KeyboardEvent) => this.processTabKey(ev),
  };

  keyCodeMapping: { [keyCode: string]: Function } = {
    NumpadDecimal: this.processNumpadDecimal,
  };

  setup() {
    onMounted(() => {
      const el = this.composerRef.el!;
      if (this.props.isDefaultFocus) {
        this.env.focusableElement.setFocusableElement(el);
      }
      this.contentHelper.updateEl(el);
    });

    useEffect(() => {
      this.processContent();
    });

    onPatched(() => {
      // Required because typing '=SUM' and double-clicking another cell leaves ShowProvider/ShowDescription true
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
      ev.preventDefault();
      ev.stopPropagation();
      updateSelectionWithArrowKeys(ev, this.env.model.selection);
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
    // All arrow keys are processed: up and down should move autocomplete, left
    // and right should move the cursor.
    ev.stopPropagation();
    this.handleArrowKeysForAutocomplete(ev);
  }

  private handleArrowKeysForAutocomplete(ev: KeyboardEvent) {
    // only for arrow up and down
    if (["ArrowUp", "ArrowDown"].includes(ev.key) && this.autoCompleteState.showProvider) {
      ev.preventDefault();
      if (ev.key === "ArrowUp") {
        this.autoCompleteState.selectedIndex--;
        if (this.autoCompleteState.selectedIndex < 0) {
          this.autoCompleteState.selectedIndex = this.autoCompleteState.values.length - 1;
        }
      } else {
        this.autoCompleteState.selectedIndex =
          (this.autoCompleteState.selectedIndex + 1) % this.autoCompleteState.values.length;
      }
    }
  }

  private processTabKey(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.env.model.getters.getEditionMode() !== "inactive") {
      if (this.autoCompleteState.showProvider) {
        const autoCompleteValue =
          this.autoCompleteState.values[this.autoCompleteState.selectedIndex]?.text;
        if (autoCompleteValue) {
          this.autoComplete(autoCompleteValue);
          return;
        }
      }
      this.env.model.dispatch("STOP_EDITION");
    }
    const direction = ev.shiftKey ? "left" : "right";
    this.env.model.selection.moveAnchorCell(direction, 1);
  }

  private processEnterKey(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.altKey || ev.ctrlKey) {
      this.composerRef.el?.dispatchEvent(
        new InputEvent("input", { inputType: "insertParagraph", bubbles: true, isComposing: false })
      );
      return;
    }

    if (this.autoCompleteState.showProvider) {
      const autoCompleteValue =
        this.autoCompleteState.values[this.autoCompleteState.selectedIndex]?.text;
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

  private processF4Key(ev: KeyboardEvent) {
    this.env.model.dispatch("CYCLE_EDITION_REFERENCES");
    this.processContent();
    ev.stopPropagation();
  }

  private processNumpadDecimal(ev: KeyboardEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    const locale = this.env.model.getters.getLocale();
    const selection = this.contentHelper.getCurrentSelection();
    const currentContent = this.env.model.getters.getCurrentContent();
    const content =
      currentContent.slice(0, selection.start) +
      locale.decimalSeparator +
      currentContent.slice(selection.end);

    // Update composer even by hand rather than dispatching an InputEvent because untrusted inputs
    // events aren't handled natively by contentEditable
    this.env.model.dispatch("SET_CURRENT_CONTENT", {
      content,
      selection: { start: selection.start + 1, end: selection.start + 1 },
    });

    // We need to do the process content here in case there is no render between the keyDown and the
    // keyUp event
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
    let handler = this.keyMapping[ev.key] || this.keyCodeMapping[ev.code];
    if (handler) {
      handler.call(this, ev);
    } else {
      ev.stopPropagation();
    }
  }

  onPaste(ev: ClipboardEvent) {
    if (this.env.model.getters.getEditionMode() !== "inactive") {
      // let the browser clipboard work
      ev.stopPropagation();
    } else {
      // the user meant to paste in the sheet, not open the composer with the pasted content
      // While we're not editing, we still have the focus and should therefore prevent
      // the native "paste" to occur.
      ev.preventDefault();
    }
  }

  /*
   * Triggered automatically by the content-editable between the keydown and key up
   * */
  onInput(ev: InputEvent) {
    if (!this.shouldProcessInputEvents) {
      return;
    }
    ev.stopPropagation();
    let content: string;
    if (this.env.model.getters.getEditionMode() === "inactive") {
      content = ev.data || "";
    } else {
      content = this.contentHelper.getText();
    }
    if (this.props.focus === "inactive") {
      return this.props.onComposerCellFocused?.(content);
    }
    let selection = this.contentHelper.getCurrentSelection();
    if (ev.inputType === "insertParagraph") {
      const start = Math.min(selection.start, selection.end);
      const end = Math.max(selection.start, selection.end);
      content = content.slice(0, start) + NEWLINE + content.slice(end);
      selection = { start: start + 1, end: start + 1 };
    }
    this.env.model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    this.env.model.dispatch("SET_CURRENT_CONTENT", {
      content,
      selection,
    });
    this.processTokenAtCursor();
  }

  onKeyup(ev: KeyboardEvent) {
    if (this.contentHelper.el === document.activeElement) {
      if (this.autoCompleteState.showProvider && ["ArrowUp", "ArrowDown"].includes(ev.key)) {
        return;
      }

      if (this.env.model.getters.isSelectingForComposer() && ev.key?.startsWith("Arrow")) {
        return;
      }

      const { start: oldStart, end: oldEnd } = this.env.model.getters.getComposerSelection();
      const { start, end } = this.contentHelper.getCurrentSelection();

      if (start !== oldStart || end !== oldEnd) {
        this.env.model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start, end });
      }

      this.processTokenAtCursor();
    }
  }

  showAutocomplete(searchTerm: string) {
    const searchTermUpperCase = searchTerm.toUpperCase();
    if (
      !this.env.model.getters.getCurrentContent().startsWith("=") ||
      searchTermUpperCase === "TRUE" ||
      searchTermUpperCase === "FALSE"
    ) {
      return;
    }
    this.autoCompleteState.showProvider = true;
    let values = Object.entries(functionRegistry.content)
      .filter(([_, { hidden }]) => !hidden)
      .map(([text, { description }]) => {
        return {
          text,
          description,
        };
      });
    if (searchTerm) {
      values = fuzzyLookup(searchTerm, values, (t) => t.text);
    } else {
      // alphabetical order
      values = values.sort((a, b) => a.text.localeCompare(b.text));
    }
    this.autoCompleteState.values = values.slice(0, 10);
    this.autoCompleteState.selectedIndex = 0;
  }

  /**
   * This is required to ensure the content helper selection is
   * properly updated on "onclick" events. Depending on the browser,
   * the callback onClick from the composer will be executed before
   * the selection was updated in the dom, which means we capture an
   * wrong selection which is then forced upon the content helper on
   * patchContent.
   */
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

  onDblClick() {
    if (this.env.model.getters.isReadonly()) {
      return;
    }
    const composerContent = this.env.model.getters.getCurrentContent();
    const isValidFormula = composerContent.startsWith("=");

    if (isValidFormula) {
      const tokens = this.env.model.getters.getCurrentTokens();
      const currentSelection = this.contentHelper.getCurrentSelection();
      if (currentSelection.start === currentSelection.end) return;

      const currentSelectedText = composerContent.substring(
        currentSelection.start,
        currentSelection.end
      );
      const token = tokens.filter(
        (token) =>
          token.value.includes(currentSelectedText) &&
          token.start <= currentSelection.start &&
          token.end >= currentSelection.end
      )[0];
      if (!token) {
        return;
      }
      if (token.type === "REFERENCE") {
        this.env.model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
          start: token.start,
          end: token.end,
        });
      }
    }
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
    this.shouldProcessInputEvents = false;
    if (this.props.focus !== "inactive") {
      this.contentHelper.el.focus();
    }
    const content = this.getContentLines();
    this.contentHelper.setText(content);

    if (content.length !== 0 && content.length[0] !== 0) {
      if (this.props.focus !== "inactive") {
        // Put the cursor back where it was before the rendering
        const { start, end } = this.env.model.getters.getComposerSelection();
        this.contentHelper.selectRange(start, end);
      }
      this.contentHelper.scrollSelectionIntoView();
    }

    this.shouldProcessInputEvents = true;
  }

  /**
   * Get the HTML content corresponding to the current composer token, divided by lines.
   */
  private getContentLines(): HtmlContent[][] {
    let value = this.env.model.getters.getCurrentContent();
    const isValidFormula = value.startsWith("=");

    if (value === "") {
      return [];
    } else if (isValidFormula && this.props.focus !== "inactive") {
      return this.splitHtmlContentIntoLines(this.getColoredTokens());
    }
    return this.splitHtmlContentIntoLines([{ value }]);
  }

  private getColoredTokens(): HtmlContent[] {
    const tokens = this.env.model.getters.getCurrentTokens();
    const tokenAtCursor = this.env.model.getters.getTokenAtCursor();
    const result: HtmlContent[] = [];
    const { end, start } = this.env.model.getters.getComposerSelection();
    for (const token of tokens) {
      switch (token.type) {
        case "OPERATOR":
        case "NUMBER":
        case "ARG_SEPARATOR":
        case "STRING":
          result.push({ value: token.value, color: tokenColors[token.type] || "#000" });
          break;
        case "REFERENCE":
          const { xc, sheetName } = splitReference(token.value);
          result.push({ value: token.value, color: this.rangeColor(xc, sheetName) || "#000" });
          break;
        case "SYMBOL":
          const value = token.value;
          const upperCaseValue = value.toUpperCase();
          if (upperCaseValue === "TRUE" || upperCaseValue === "FALSE") {
            result.push({ value: token.value, color: tokenColors.NUMBER });
          } else if (upperCaseValue in functionRegistry.content) {
            result.push({ value: token.value, color: tokenColors.FUNCTION });
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
            result.push({ value: token.value, color: tokenColors.MATCHING_PAREN || "#000" });
          } else {
            result.push({ value: token.value, color: tokenColors[token.type] || "#000" });
          }
          break;
        default:
          result.push({ value: token.value, color: "#000" });
          break;
      }
      if (this.env.model.getters.showSelectionIndicator() && end === start && end === token.end) {
        result[result.length - 1].class = selectionIndicatorClass;
      }
    }
    return result;
  }

  /**
   * Split an array of HTMLContents into lines. Each NEWLINE character encountered will create a new
   * line. Contents can be split into multiple parts if they contain multiple NEWLINE characters.
   */
  private splitHtmlContentIntoLines(contents: HtmlContent[]): HtmlContent[][] {
    const contentSplitInLines: HtmlContent[][] = [];
    let currentLine: HtmlContent[] = [];

    for (const content of contents) {
      if (content.value.includes(NEWLINE)) {
        const lines = content.value.split(NEWLINE);
        const lastLine = lines.pop()!;
        for (const line of lines) {
          currentLine.push({ color: content.color, value: line }); // don't copy class, only last line should keep it
          contentSplitInLines.push(currentLine);
          currentLine = [];
        }
        currentLine.push({ ...content, value: lastLine });
      } else {
        currentLine.push(content);
      }
    }
    if (currentLine.length) {
      contentSplitInLines.push(currentLine);
    }

    // Remove useless empty contents
    const filteredLines: HtmlContent[][] = [];
    for (const line of contentSplitInLines) {
      if (line.every(this.isContentEmpty)) {
        filteredLines.push([line[0]]);
      } else {
        filteredLines.push(line.filter((content) => !this.isContentEmpty(content)));
      }
    }

    return filteredLines;
  }

  private isContentEmpty(content: HtmlContent): boolean {
    return !(content.value || content.class);
  }

  private rangeColor(xc: string, sheetName?: string): Color | undefined {
    if (this.props.focus === "inactive") {
      return undefined;
    }
    const highlights = this.env.model.getters.getHighlights();
    const refSheet = sheetName
      ? this.env.model.getters.getSheetIdByName(sheetName)
      : this.env.model.getters.getCurrentEditedCell()?.sheetId;

    const highlight = highlights.find((highlight) => {
      if (highlight.sheetId !== refSheet) return false;

      const range = this.env.model.getters.getRangeFromSheetXC(refSheet, xc);
      let zone = range.zone;
      zone = getZoneArea(zone) === 1 ? this.env.model.getters.expandZone(refSheet, zone) : zone;
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
      const token = this.env.model.getters.getTokenAtCursor();
      if (!token) {
        return;
      }
      if (token.type === "SYMBOL") {
        // initialize Autocomplete Dropdown
        this.showAutocomplete(token.value);
        return;
      }
      const tokenContext = token.functionContext;
      const parentFunction = tokenContext?.parent.toUpperCase();
      if (
        tokenContext &&
        parentFunction &&
        parentFunction in functions &&
        token.type !== "UNKNOWN"
      ) {
        // initialize Formula Assistant
        const description = functions[parentFunction];
        const argPosition = tokenContext.argPosition;

        this.functionDescriptionState.functionName = parentFunction;
        this.functionDescriptionState.functionDescription = description;
        this.functionDescriptionState.argToFocus = description.getArgToFocus(argPosition + 1) - 1;
        this.functionDescriptionState.showDescription = true;
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
        if (tokens.length) {
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

Composer.props = {
  inputStyle: { type: String, optional: true },
  rect: { type: Object, optional: true },
  delimitation: { type: Object, optional: true },
  focus: { validate: (value: string) => ["inactive", "cellFocus", "contentFocus"].includes(value) },
  onComposerCellFocused: { type: Function, optional: true },
  onComposerContentFocused: Function,
  isDefaultFocus: { type: Boolean, optional: true },
  onInputContextMenu: { type: Function, optional: true },
};
