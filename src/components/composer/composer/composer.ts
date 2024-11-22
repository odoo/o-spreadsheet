import { Component, onMounted, useEffect, useRef, useState } from "@odoo/owl";
import { NEWLINE, PRIMARY_BUTTON_BG, SCROLLBAR_WIDTH } from "../../../constants";
import { functionRegistry } from "../../../functions/index";
import { clip, setColorAlpha } from "../../../helpers/index";

import { EnrichedToken } from "../../../formulas/composer_tokenizer";
import { Store, useLocalStore, useStore } from "../../../store_engine";
import { DOMFocusableElementStore } from "../../../stores/DOM_focus_store";
import {
  CSSProperties,
  Color,
  ComposerFocusType,
  DOMDimension,
  Direction,
  FunctionDescription,
  Rect,
  SpreadsheetChildEnv,
} from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { keyboardEventToShortcutString } from "../../helpers/dom_helpers";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { updateSelectionWithArrowKeys } from "../../helpers/selection_helpers";
import { TextValueProvider } from "../autocomplete_dropdown/autocomplete_dropdown";
import { AutoCompleteStore } from "../autocomplete_dropdown/autocomplete_dropdown_store";
import { ContentEditableHelper } from "../content_editable_helper";
import { FunctionDescriptionProvider } from "../formula_assistant/formula_assistant";
import { DEFAULT_TOKEN_COLOR } from "./abstract_composer_store";
import { CellComposerStore } from "./cell_composer_store";

const functions = functionRegistry.content;

const ASSISTANT_WIDTH = 300;
const CLOSE_ICON_RADIUS = 9;

export const selectionIndicatorClass = "selector-flag";
const backgroundClass = "background-flag";
const selectionIndicatorColor = "#a9a9a9";
const selectionIndicator = "␣";

export type HtmlContent = {
  value: string;
  color?: Color;
  class?: string;
};

css/* scss */ `
  .o-composer-container {
    .o-composer {
      overflow-y: auto;
      overflow-x: hidden;
      word-break: break-all;
      padding-right: 2px;

      box-sizing: border-box;

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

          &.${backgroundClass} {
            border-radius: 5px;
            background-color: lightgray;
            padding: 0px 1.5px 1.5px 1.5px;
          }
        }
      }
    }
    .o-composer[placeholder]:empty:not(:focus):not(.active)::before {
      content: attr(placeholder);
      color: #bdbdbd;
      position: relative;
      top: 0%;
      pointer-events: none;
    }

    .fa-stack {
      /* reset stack size which is doubled by default */
      width: ${CLOSE_ICON_RADIUS * 2}px;
      height: ${CLOSE_ICON_RADIUS * 2}px;
      line-height: ${CLOSE_ICON_RADIUS * 2}px;
    }

    .force-open-assistant {
      left: -1px;
      top: -1px;

      .fa-question-circle {
        color: ${PRIMARY_BUTTON_BG};
      }
    }

    .o-composer-assistant {
      position: absolute;
      margin: 1px 4px;

      .o-semi-bold {
        /** FIXME: to remove in favor of Bootstrap
        * 'fw-semibold' when we upgrade to Bootstrap 5.2
        */
        font-weight: 600 !important;
      }
    }
  }
`;

export interface CellComposerProps {
  focus: ComposerFocusType;
  inputStyle?: string;
  rect?: Rect;
  delimitation?: DOMDimension;
  onComposerContentFocused: () => void;
  onComposerCellFocused?: (content: String) => void;
  onInputContextMenu?: (event: MouseEvent) => void;
  isDefaultFocus?: boolean;
  composerStore: Store<CellComposerStore>;
  placeholder?: string;
}

interface ComposerState {
  positionStart: number;
  positionEnd: number;
}

interface FunctionDescriptionState {
  showDescription: boolean;
  functionName: string;
  functionDescription: FunctionDescription;
  argToFocus: number;
}

export class Composer extends Component<CellComposerProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Composer";
  static props = {
    focus: {
      validate: (value: string) => ["inactive", "cellFocus", "contentFocus"].includes(value),
    },
    inputStyle: { type: String, optional: true },
    rect: { type: Object, optional: true },
    delimitation: { type: Object, optional: true },
    onComposerCellFocused: { type: Function, optional: true },
    onComposerContentFocused: Function,
    isDefaultFocus: { type: Boolean, optional: true },
    onInputContextMenu: { type: Function, optional: true },
    composerStore: Object,
    placeholder: { type: String, optional: true },
  };
  static components = { TextValueProvider, FunctionDescriptionProvider };
  static defaultProps = {
    inputStyle: "",
    isDefaultFocus: false,
  };

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  composerRef = useRef("o_composer");

  contentHelper: ContentEditableHelper = new ContentEditableHelper(this.composerRef.el!);

  composerState: ComposerState = useState({
    positionStart: 0,
    positionEnd: 0,
  });

  autoCompleteState!: Store<AutoCompleteStore>;

  functionDescriptionState: FunctionDescriptionState = useState({
    showDescription: false,
    functionName: "",
    functionDescription: {} as FunctionDescription,
    argToFocus: 0,
  });
  assistant = useState({
    forcedClosed: false,
  });
  private compositionActive: boolean = false;
  private spreadsheetRect = useSpreadsheetRect();

  get assistantStyle(): string {
    const composerRect = this.composerRef.el!.getBoundingClientRect();
    const assistantStyle: CSSProperties = {};

    assistantStyle["min-width"] = `${this.props.rect?.width || ASSISTANT_WIDTH}px`;
    const proposals = this.autoCompleteState.provider?.proposals;
    const proposalsHaveDescription = proposals?.some((proposal) => proposal.description);
    if (this.functionDescriptionState.showDescription || proposalsHaveDescription) {
      assistantStyle.width = `${ASSISTANT_WIDTH}px`;
    }

    if (this.props.delimitation && this.props.rect) {
      const { x: cellX, y: cellY, height: cellHeight } = this.props.rect;
      const remainingHeight = this.props.delimitation.height - (cellY + cellHeight);
      assistantStyle["max-height"] = `${remainingHeight}px`;
      if (cellY > remainingHeight) {
        const availableSpaceAbove = cellY;
        assistantStyle["max-height"] = `${availableSpaceAbove - CLOSE_ICON_RADIUS}px`;
        // render top
        // We compensate 2 px of margin on the assistant style + 1px for design reasons
        assistantStyle.top = `-3px`;
        assistantStyle.transform = `translate(0, -100%)`;
      }
      if (cellX + ASSISTANT_WIDTH > this.props.delimitation.width) {
        // render left
        assistantStyle.right = `0px`;
      }
    } else {
      assistantStyle["max-height"] = `${this.spreadsheetRect.height - composerRect.bottom}px`;
      if (
        composerRect.left + ASSISTANT_WIDTH + SCROLLBAR_WIDTH + CLOSE_ICON_RADIUS >
        this.spreadsheetRect.width
      ) {
        assistantStyle.right = `${CLOSE_ICON_RADIUS}px`;
      }
    }
    return cssPropertiesToCss(assistantStyle);
  }

  // we can't allow input events to be triggered while we remove and add back the content of the composer in processContent
  shouldProcessInputEvents: boolean = false;
  tokens: EnrichedToken[] = [];

  keyMapping: { [key: string]: Function } = {
    Enter: (ev: KeyboardEvent) => this.processEnterKey(ev, "down"),
    "Shift+Enter": (ev: KeyboardEvent) => this.processEnterKey(ev, "up"),
    "Alt+Enter": this.processNewLineEvent,
    "Ctrl+Enter": this.processNewLineEvent,
    Escape: this.processEscapeKey,
    F2: (ev: KeyboardEvent) => this.toggleEditionMode(ev),
    F4: (ev: KeyboardEvent) => this.processF4Key(ev),
    Tab: (ev: KeyboardEvent) => this.processTabKey(ev, "right"),
    "Shift+Tab": (ev: KeyboardEvent) => this.processTabKey(ev, "left"),
  };

  keyCodeMapping: { [keyCode: string]: Function } = {
    NumpadDecimal: this.processNumpadDecimal,
  };

  setup() {
    this.DOMFocusableElementStore = useStore(DOMFocusableElementStore);
    this.autoCompleteState = useLocalStore(AutoCompleteStore);
    onMounted(() => {
      const el = this.composerRef.el!;
      if (this.props.isDefaultFocus) {
        this.DOMFocusableElementStore.setFocusableElement(el);
      }
      this.contentHelper.updateEl(el);
    });

    useEffect(() => {
      this.processContent();
      if (
        document.activeElement === this.contentHelper.el &&
        this.props.composerStore.editionMode === "inactive" &&
        !this.props.isDefaultFocus
      ) {
        this.DOMFocusableElementStore.focus();
      }
    });

    useEffect(
      () => {
        this.processTokenAtCursor();
      },
      () => [this.props.composerStore.editionMode !== "inactive"]
    );
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  private processArrowKeys(ev: KeyboardEvent) {
    const tokenAtCursor = this.props.composerStore.tokenAtCursor;
    if (
      (this.props.composerStore.isSelectingRange ||
        this.props.composerStore.editionMode === "inactive") &&
      !(
        ["ArrowUp", "ArrowDown"].includes(ev.key) &&
        this.autoCompleteState.provider &&
        tokenAtCursor?.type !== "REFERENCE"
      )
    ) {
      this.functionDescriptionState.showDescription = false;
      this.autoCompleteState.hide();
      // Prevent the default content editable behavior which moves the cursor
      ev.preventDefault();
      ev.stopPropagation();
      updateSelectionWithArrowKeys(ev, this.env.model.selection);
      return;
    }
    const content = this.props.composerStore.currentContent;
    if (
      this.props.focus === "cellFocus" &&
      !this.autoCompleteState.provider &&
      !content.startsWith("=")
    ) {
      this.props.composerStore.stopEdition();
      return;
    }
    // All arrow keys are processed: up and down should move autocomplete, left
    // and right should move the cursor.
    ev.stopPropagation();
    this.handleArrowKeysForAutocomplete(ev);
  }

  private handleArrowKeysForAutocomplete(ev: KeyboardEvent) {
    // only for arrow up and down
    if (["ArrowUp", "ArrowDown"].includes(ev.key) && this.autoCompleteState.provider) {
      ev.preventDefault();
      this.autoCompleteState.moveSelection(ev.key === "ArrowDown" ? "next" : "previous");
    }
  }

  private processTabKey(ev: KeyboardEvent, direction: Direction) {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.props.composerStore.editionMode !== "inactive") {
      const state = this.autoCompleteState;
      if (state.provider && state.selectedIndex !== undefined) {
        const autoCompleteValue = state.provider.proposals[state.selectedIndex]?.text;
        if (autoCompleteValue) {
          this.autoComplete(autoCompleteValue);
          return;
        }
      }
      this.props.composerStore.stopEdition(direction);
    }
  }

  private processEnterKey(ev: KeyboardEvent, direction: Direction) {
    ev.preventDefault();
    ev.stopPropagation();

    const state = this.autoCompleteState;
    if (state.provider && state.selectedIndex !== undefined) {
      const autoCompleteValue = state.provider.proposals[state.selectedIndex]?.text;
      if (autoCompleteValue) {
        this.autoComplete(autoCompleteValue);
        return;
      }
    }
    this.props.composerStore.stopEdition(direction);
  }

  private processNewLineEvent(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const content = this.contentHelper.getText();
    const selection = this.contentHelper.getCurrentSelection();
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);

    this.props.composerStore.stopComposerRangeSelection();
    this.props.composerStore.setCurrentContent(
      content.slice(0, start) + NEWLINE + content.slice(end),
      {
        start: start + 1,
        end: start + 1,
      }
    );
    this.processContent();
  }

  private processEscapeKey(ev) {
    this.props.composerStore.cancelEdition();
    ev.stopPropagation();
    ev.preventDefault();
  }

  private processF4Key(ev: KeyboardEvent) {
    ev.stopPropagation();
    this.props.composerStore.cycleReferences();
    this.processContent();
  }

  private toggleEditionMode(ev: KeyboardEvent) {
    ev.stopPropagation();
    this.props.composerStore.toggleEditionMode();
    this.processContent();
  }

  private processNumpadDecimal(ev: KeyboardEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    const locale = this.env.model.getters.getLocale();
    const selection = this.contentHelper.getCurrentSelection();
    const currentContent = this.props.composerStore.currentContent;
    const content =
      currentContent.slice(0, selection.start) +
      locale.decimalSeparator +
      currentContent.slice(selection.end);

    // Update composer even by hand rather than dispatching an InputEvent because untrusted inputs
    // events aren't handled natively by contentEditable
    this.props.composerStore.setCurrentContent(content, {
      start: selection.start + 1,
      end: selection.start + 1,
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
    if (this.props.composerStore.editionMode === "inactive") {
      return;
    }
    if (ev.key.startsWith("Arrow")) {
      this.processArrowKeys(ev);
      return;
    }
    let handler =
      this.keyMapping[keyboardEventToShortcutString(ev)] ||
      this.keyCodeMapping[keyboardEventToShortcutString(ev, "code")];
    if (handler) {
      handler.call(this, ev);
    } else {
      ev.stopPropagation();
    }
  }

  onPaste(ev: ClipboardEvent) {
    if (this.props.composerStore.editionMode !== "inactive") {
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
    if (this.props.composerStore.editionMode === "inactive") {
      content = ev.data || "";
    } else {
      content = this.contentHelper.getText();
    }
    if (this.props.focus === "inactive") {
      return this.props.onComposerCellFocused?.(content);
    }

    let selection = this.contentHelper.getCurrentSelection();
    this.props.composerStore.stopComposerRangeSelection();
    this.props.composerStore.setCurrentContent(content, selection);
    this.processTokenAtCursor();
  }

  onKeyup(ev: KeyboardEvent) {
    if (this.contentHelper.el === document.activeElement) {
      if (this.autoCompleteState.provider && ["ArrowUp", "ArrowDown"].includes(ev.key)) {
        return;
      }

      if (this.props.composerStore.isSelectingRange && ev.key?.startsWith("Arrow")) {
        return;
      }

      const { start: oldStart, end: oldEnd } = this.props.composerStore.composerSelection;
      const { start, end } = this.contentHelper.getCurrentSelection();

      if (start !== oldStart || end !== oldEnd) {
        this.props.composerStore.changeComposerCursorSelection(start, end);
      }

      this.processTokenAtCursor();
    }
  }

  onBlur(ev: FocusEvent) {
    if (this.props.composerStore.editionMode === "inactive") {
      return;
    }
    const target = ev.relatedTarget;
    if (!target || !(target instanceof HTMLElement)) {
      this.props.composerStore.stopEdition();
      return;
    }
    if (target.attributes.getNamedItem("composerFocusableElement")) {
      this.contentHelper.el.focus();
      return;
    }
    if (target.classList.contains("o-composer")) {
      return;
    }
    this.props.composerStore.stopEdition();
  }

  updateAutoCompleteIndex(index: number) {
    this.autoCompleteState.selectIndex(clip(0, index, 10));
  }

  /**
   * This is required to ensure the content helper selection is
   * properly updated on "onclick" events. Depending on the browser,
   * the callback onClick from the composer will be executed before
   * the selection was updated in the dom, which means we capture an
   * wrong selection which is then forced upon the content helper on
   * processContent.
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

    this.props.composerStore.stopComposerRangeSelection();
    this.props.onComposerContentFocused();

    this.props.composerStore.changeComposerCursorSelection(newSelection.start, newSelection.end);
    this.processTokenAtCursor();
  }

  onDblClick() {
    if (this.env.model.getters.isReadonly()) {
      return;
    }
    const composerContent = this.props.composerStore.currentContent;
    const isValidFormula = composerContent.startsWith("=");

    if (isValidFormula) {
      const tokens = this.props.composerStore.currentTokens;
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
        this.props.composerStore.changeComposerCursorSelection(token.start, token.end);
      }
    }
  }

  onContextMenu(ev: MouseEvent) {
    if (this.props.composerStore.editionMode === "inactive") {
      this.props.onInputContextMenu?.(ev);
    }
  }

  closeAssistant() {
    this.assistant.forcedClosed = true;
  }

  openAssistant() {
    this.assistant.forcedClosed = false;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private processContent() {
    if (this.compositionActive) {
      return;
    }
    this.shouldProcessInputEvents = false;
    if (this.props.focus !== "inactive" && document.activeElement !== this.contentHelper.el) {
      this.contentHelper.el.focus();
    }
    const content = this.getContentLines();
    this.contentHelper.setText(content);

    if (content.length !== 0 && content.length[0] !== 0) {
      if (this.props.focus !== "inactive") {
        // Put the cursor back where it was before the rendering
        const { start, end } = this.props.composerStore.composerSelection;
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
    let value = this.props.composerStore.currentContent;
    const isValidFormula = value.startsWith("=");

    if (value === "") {
      return [];
    } else if (isValidFormula && this.props.focus !== "inactive") {
      return this.splitHtmlContentIntoLines(this.getHtmlContentFromTokens());
    }
    return this.splitHtmlContentIntoLines([{ value }]);
  }

  private getHtmlContentFromTokens(): HtmlContent[] {
    const tokens = this.props.composerStore.currentTokens;
    const result: HtmlContent[] = [];
    const { end, start } = this.props.composerStore.composerSelection;
    for (const token of tokens) {
      let color = token.color || DEFAULT_TOKEN_COLOR;
      if (token.isBlurred) {
        color = setColorAlpha(color, 0.5);
      }
      result.push({ value: token.value, color });
      if (
        token.type === "REFERENCE" &&
        this.props.composerStore.tokenAtCursor === token &&
        this.props.composerStore.editionMode === "selecting"
      ) {
        result[result.length - 1].class = "text-decoration-underline";
      }

      if (end === start && token.isParenthesisLinkedToCursor) {
        result[result.length - 1].class = backgroundClass;
      }

      if (this.props.composerStore.showSelectionIndicator && end === start && end === token.end) {
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

  /**
   * Compute the state of the composer from the tokenAtCursor.
   * If the token is a function or symbol (that isn't a cell/range reference) we have to initialize
   * the autocomplete engine otherwise we initialize the formula assistant.
   */
  private processTokenAtCursor(): void {
    let content = this.props.composerStore.currentContent;
    if (this.autoCompleteState.provider) {
      this.autoCompleteState.hide();
    }
    this.functionDescriptionState.showDescription = false;
    const autoCompleteProvider = this.props.composerStore.autocompleteProvider;
    if (autoCompleteProvider) {
      this.autoCompleteState.useProvider(autoCompleteProvider);
    }
    const token = this.props.composerStore.tokenAtCursor;

    if (content.startsWith("=") && token && token.type !== "SYMBOL") {
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
    if (!value || this.assistant.forcedClosed) {
      return;
    }
    this.autoCompleteState.provider?.selectProposal(value);
    this.processTokenAtCursor();
  }
}
