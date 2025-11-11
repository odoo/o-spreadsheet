import { NEWLINE, SCROLLBAR_WIDTH } from "@odoo/o-spreadsheet-engine/constants";
import { Component, onMounted, onWillUnmount, useEffect, useRef, useState } from "@odoo/owl";
import { debounce, deepEquals, isFormula } from "../../../helpers/index";

import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { DEFAULT_TOKEN_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { EnrichedToken } from "@odoo/o-spreadsheet-engine/formulas/composer_tokenizer";
import { argTargeting } from "@odoo/o-spreadsheet-engine/functions/arguments";
import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Store, useStore } from "../../../store_engine";
import { DOMFocusableElementStore } from "../../../stores/DOM_focus_store";
import {
  CSSProperties,
  Color,
  ComposerFocusType,
  DOMDimension,
  Direction,
  FunctionDescription,
  Rect,
} from "../../../types/index";
import { isIOS, keyboardEventToShortcutString } from "../../helpers/dom_helpers";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { updateSelectionWithArrowKeys } from "../../helpers/selection_helpers";
import { TextValueProvider } from "../autocomplete_dropdown/autocomplete_dropdown";
import { ContentEditableHelper } from "../content_editable_helper";
import { FunctionDescriptionProvider } from "../formula_assistant/formula_assistant";
import { SpeechBubble } from "../speech_bubble/speech_bubble";
import { ComposerSelection } from "./abstract_composer_store";
import { CellComposerStore } from "./cell_composer_store";

const functions = functionRegistry.content;

const ASSISTANT_WIDTH = 300;
const CLOSE_ICON_RADIUS = 9;

const selectionIndicatorClass = "selector-flag";
const highlightParenthesisClass = "highlight-parenthesis-flag";
const highlightClass = "highlight-flag";

export type HtmlContent = {
  value: string;
  onHover?: (rect: Rect) => void;
  onStopHover?: () => void;
  color?: Color;
  opacity?: number;
  backgroundColor?: Color;
  classes?: string[];
};

export interface CellComposerProps {
  focus: ComposerFocusType;
  inputStyle?: string;
  rect?: Rect;
  delimitation?: DOMDimension;
  onComposerContentFocused: (selection: ComposerSelection) => void;
  onComposerCellFocused?: (content: string) => void;
  onInputContextMenu?: (event: MouseEvent) => void;
  isDefaultFocus?: boolean;
  composerStore: Store<CellComposerStore>;
  placeholder?: string;
  inputMode?: ElementContentEditable["inputMode"];
  showAssistant?: boolean;
}

interface ComposerState {
  positionStart: number;
  positionEnd: number;
  hoveredRect: Rect | undefined;
}

interface FunctionDescriptionState {
  showDescription: boolean;
  functionDescription: FunctionDescription;
  argsToFocus: number[];
  repeatingArgGroupIndex: number | undefined;
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
    inputMode: { type: String, optional: true },
    showAssistant: { type: Boolean, optional: true },
  };
  static components = { TextValueProvider, FunctionDescriptionProvider, SpeechBubble };
  static defaultProps = {
    inputStyle: "",
    isDefaultFocus: false,
    inputMode: "text",
    showAssistant: true,
  };

  private DOMFocusableElementStore!: Store<DOMFocusableElementStore>;

  composerRef = useRef("o_composer");
  containerRef = useRef("composerContainer");

  contentHelper: ContentEditableHelper = new ContentEditableHelper(this.composerRef.el!);

  composerState: ComposerState = useState({
    positionStart: 0,
    positionEnd: 0,
    hoveredRect: undefined,
  });

  functionDescriptionState: FunctionDescriptionState = useState({
    showDescription: false,
    functionDescription: {} as FunctionDescription,
    argsToFocus: [],
    repeatingArgGroupIndex: 0,
  });
  assistant = useState({
    forcedClosed: false,
  });
  private compositionActive: boolean = false;
  private spreadsheetRect = useSpreadsheetRect();
  private lastHoveredTokenIndex: number | undefined = undefined;

  private debouncedHover = debounce((tokenIndex: number | undefined, hoveredRect?: Rect) => {
    const selection = this.contentHelper.getCurrentSelection();
    if (selection.start !== selection.end) {
      return;
    }
    const currentHoveredContext = this.props.composerStore.hoveredTokens;
    this.props.composerStore.hoverToken(tokenIndex);
    if (!deepEquals(currentHoveredContext, this.props.composerStore.hoveredTokens)) {
      this.composerState.hoveredRect = hoveredRect;
    }
  }, 120);

  get assistantStyleProperties(): CSSProperties {
    const composerRect = this.composerRef.el!.getBoundingClientRect();
    const assistantStyle: CSSProperties = {};

    const minWidth = Math.min(this.props.rect?.width || Infinity, ASSISTANT_WIDTH);
    assistantStyle["min-width"] = `${minWidth}px`;
    const proposals = this.props.composerStore.autoCompleteProposals;
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
      assistantStyle["max-height"] = `${this.spreadsheetRect.height - composerRect.bottom - 1}px`; // -1: margin
      if (
        composerRect.left + ASSISTANT_WIDTH + SCROLLBAR_WIDTH + CLOSE_ICON_RADIUS >
        this.spreadsheetRect.width
      ) {
        assistantStyle.right = `${CLOSE_ICON_RADIUS}px`;
      }
    }
    return assistantStyle;
  }

  get assistantStyle() {
    const allProperties = this.assistantStyleProperties;
    return cssPropertiesToCss({
      "max-height": allProperties["max-height"],
      width: allProperties["width"],
      "min-width": allProperties["min-width"],
    });
  }

  get assistantContainerStyle() {
    const allProperties = this.assistantStyleProperties;
    return cssPropertiesToCss({
      top: allProperties["top"],
      right: allProperties["right"],
      transform: allProperties["transform"],
    });
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
    onMounted(() => {
      const el = this.composerRef.el!;
      if (this.props.isDefaultFocus) {
        this.DOMFocusableElementStore.setFocusableElement(el);
      }
      this.contentHelper.updateEl(el);
    });
    onWillUnmount(() => {
      this.debouncedHover.stopDebounce();
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

    useEffect(
      () => {
        this.contentHelper.scrollSelectionIntoView();
      },
      () => [
        this.props.composerStore.composerSelection.start,
        this.props.composerStore.composerSelection.end,
      ]
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
        this.props.composerStore.isAutoCompleteDisplayed &&
        tokenAtCursor?.type !== "REFERENCE"
      )
    ) {
      this.functionDescriptionState.showDescription = false;
      this.props.composerStore.hideHelp();
      // Prevent the default content editable behavior which moves the cursor
      ev.preventDefault();
      ev.stopPropagation();
      updateSelectionWithArrowKeys(ev, this.env.model.selection);
      return;
    }
    const content = this.props.composerStore.currentContent;
    if (
      this.props.focus === "cellFocus" &&
      !this.props.composerStore.isAutoCompleteDisplayed &&
      !isFormula(content)
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
    if (
      ["ArrowUp", "ArrowDown"].includes(ev.key) &&
      this.props.composerStore.isAutoCompleteDisplayed
    ) {
      ev.preventDefault();
      this.props.composerStore.moveAutoCompleteSelection(
        ev.key === "ArrowDown" ? "next" : "previous"
      );
    }
  }

  private processTabKey(ev: KeyboardEvent, direction: Direction) {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.composerStore.autoCompleteOrStop(direction, this.assistant.forcedClosed);
  }

  private processEnterKey(ev: KeyboardEvent, direction: Direction) {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.composerStore.autoCompleteOrStop(direction, this.assistant.forcedClosed);
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
    const handler =
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

    const selection = this.contentHelper.getCurrentSelection();
    this.props.composerStore.stopComposerRangeSelection();
    this.props.composerStore.setCurrentContent(content, selection);
    this.processTokenAtCursor();
  }

  onKeyup(ev: KeyboardEvent) {
    if (this.contentHelper.el === document.activeElement) {
      if (
        this.props.composerStore.isAutoCompleteDisplayed &&
        ["ArrowUp", "ArrowDown"].includes(ev.key)
      ) {
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

    if (this.containerRef.el?.contains(ev.relatedTarget as Node)) {
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

    if (this.env.isMobile() && !isIOS()) {
      return;
    }
    this.debouncedHover.stopDebounce();
    this.contentHelper.removeSelection();
  }

  onMouseup() {
    if (this.env.model.getters.isReadonly()) {
      return;
    }
    const selection = this.contentHelper.getCurrentSelection();
    if (selection.start !== selection.end) {
      this.props.composerStore.hoverToken(undefined);
    }
  }

  onClick() {
    if (this.env.model.getters.isReadonly()) {
      return;
    }
    const newSelection = this.contentHelper.getCurrentSelection();
    const isCurrentlyInactive = this.props.composerStore.editionMode === "inactive";
    this.props.onComposerContentFocused(newSelection);
    if (!isCurrentlyInactive) {
      this.props.composerStore.changeComposerCursorSelection(newSelection.start, newSelection.end);
    }
    this.processTokenAtCursor();
  }

  onDblClick() {
    if (this.env.model.getters.isReadonly()) {
      return;
    }
    const composerContent = this.props.composerStore.currentContent;
    const isValidFormula = isFormula(composerContent);

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
    if (!this.props.composerStore.canBeToggled) return;
    this.assistant.forcedClosed = true;
  }

  openAssistant() {
    if (!this.props.composerStore.canBeToggled) return;
    this.assistant.forcedClosed = false;
  }

  onWheel(event: WheelEvent) {
    // detect if scrollbar is available
    if (
      this.composerRef.el &&
      this.composerRef.el.scrollHeight > this.composerRef.el.clientHeight
    ) {
      event.stopPropagation();
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
    }

    this.shouldProcessInputEvents = true;
  }

  /**
   * Get the HTML content corresponding to the current composer token, divided by lines.
   */
  private getContentLines(): HtmlContent[][] {
    const value = this.props.composerStore.currentContent;
    const isValidFormula = isFormula(value);

    if (value === "") {
      return [];
    } else if (isValidFormula && this.props.focus !== "inactive") {
      return this.splitHtmlContentIntoLines(this.getHtmlContentFromTokens());
    }
    return this.splitHtmlContentIntoLines([{ value, classes: [] }]);
  }

  private getHtmlContentFromTokens(): HtmlContent[] {
    const tokens = this.props.composerStore.currentTokens;
    const result: HtmlContent[] = [];
    const { end, start } = this.props.composerStore.composerSelection;
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      const classes: string[] = [];
      if (
        token.type === "REFERENCE" &&
        this.props.composerStore.tokenAtCursor === token &&
        this.props.composerStore.editionMode === "selecting"
      ) {
        classes.push("text-decoration-underline");
      }

      if (end === start && token.isParenthesisLinkedToCursor) {
        classes.push(highlightParenthesisClass);
      }

      if (token.isInHoverContext) {
        classes.push(highlightClass);
      }

      if (this.props.composerStore.showSelectionIndicator && end === start && end === token.end) {
        classes.push(selectionIndicatorClass);
      }

      result.push({
        value: token.value,
        color: token.color || DEFAULT_TOKEN_COLOR,
        opacity: token.isBlurred ? 0.5 : 1,
        classes,
        onHover: (rect) => this.onTokenHover(index, rect),
        onStopHover: () => this.onTokenHover(undefined),
      });
    }

    return result;
  }

  private onTokenHover(tokenIndex: number | undefined, hoveredRect?: Rect) {
    // We want to debounce the hover event to avoid flickering, but we also don't want to keep delaying the debounce timer
    // if the user keeps moving its mouse over the same token.
    if (this.lastHoveredTokenIndex !== tokenIndex) {
      this.lastHoveredTokenIndex = tokenIndex;
      this.debouncedHover(tokenIndex, hoveredRect);
    }
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
    return !(content.value || content.classes?.length);
  }

  /**
   * Compute the state of the composer from the tokenAtCursor.
   * If the token is a function or symbol (that isn't a cell/range reference) we have to initialize
   * the autocomplete engine otherwise we initialize the formula assistant.
   */
  private processTokenAtCursor(): void {
    const composerStore = this.props.composerStore;
    this.functionDescriptionState.showDescription = false;
    const token = this.props.composerStore.tokenAtCursor;

    if (isFormula(composerStore.currentContent) && token && token.type !== "SYMBOL") {
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
        const nbrArgSupplied = tokenContext.args.length;

        this.functionDescriptionState.functionDescription = description;
        const isParenthesisClosed = this.props.composerStore.currentTokens.some(
          (t) => t.type === "RIGHT_PAREN" && t.parenthesesCode === token.parenthesesCode
        );

        this.functionDescriptionState.argsToFocus = this.getArgsToFocus(
          isParenthesisClosed,
          description,
          nbrArgSupplied,
          argPosition
        );

        this.functionDescriptionState.showDescription = true;
        this.functionDescriptionState.repeatingArgGroupIndex = this.getRepeatingArgGroupIndex(
          description,
          nbrArgSupplied,
          argPosition
        );
      }
    }
  }

  private getRepeatingArgGroupIndex(
    description: FunctionDescription,
    nbrArgSupplied: number,
    argPosition: number
  ): number | undefined {
    const { minArgRequired, maxArgPossible, nbrArgRepeating } = description;

    if (!nbrArgRepeating) {
      return undefined;
    }

    const groupsOfOptionalRepeatingValues = nbrArgRepeating
      ? Math.ceil((nbrArgSupplied - minArgRequired) / nbrArgRepeating)
      : 0;

    const nbrArgSuppliedRoundedToGroupOfRepeating =
      groupsOfOptionalRepeatingValues * nbrArgRepeating + minArgRequired;
    return (
      argTargeting(
        description,
        Math.max(Math.min(maxArgPossible, nbrArgSuppliedRoundedToGroupOfRepeating), minArgRequired)
      )(argPosition).repeatingGroupIndex ?? 0
    );
  }

  /**
   * Compute the arguments to focus depending on the current value position.
   *
   * Normally, 'argTargeting' is used to compute the argument to focus, but in the composer,
   * we don't yet know how many arguments the user will supply.
   *
   * This function computes all the possible arguments to focus for different numbers of arguments supplied.
   */
  private getArgsToFocus(
    isParenthesisClosed: boolean,
    description: FunctionDescription,
    nbrArgSupplied: number,
    argPosition: number
  ): number[] {
    const { nbrArgRepeating, minArgRequired, nbrOptionalNonRepeatingArgs, maxArgPossible } =
      description;

    // When the parenthesis is closed, we consider the user is done with the function,
    // so we know exactly the number of arguments supplied.
    if (isParenthesisClosed) {
      const focusedArg = argTargeting(
        description,
        Math.max(Math.min(maxArgPossible, nbrArgSupplied), minArgRequired)
      )(argPosition)?.index;
      return focusedArg !== undefined ? [focusedArg] : [];
    }

    // Otherwise, the user is still typing the formula, so we don't know yet how many arguments the user will supply.
    // Consequently, we need to compute for all possible numbers of arguments supplied.
    const minArgsNumberPossibility = Math.max(nbrArgSupplied, minArgRequired);
    const maxArgsNumberPossibility = nbrArgRepeating
      ? minArgRequired +
        Math.ceil((minArgsNumberPossibility - minArgRequired) / nbrArgRepeating) * nbrArgRepeating +
        nbrOptionalNonRepeatingArgs
      : maxArgPossible;

    const argsToFocus: number[] = [];
    for (let i = minArgsNumberPossibility; i <= maxArgsNumberPossibility; i++) {
      const focusedArg = argTargeting(description, i)(argPosition)?.index;
      if (focusedArg !== undefined) {
        argsToFocus.push(focusedArg);
      }
    }

    return [...new Set(argsToFocus)];
  }

  autoComplete(value: string) {
    if (!value || (this.assistant.forcedClosed && this.props.composerStore.canBeToggled)) {
      return;
    }
    this.props.composerStore.insertAutoCompleteValue(value);
    this.processTokenAtCursor();
  }

  get displaySpeechBubble(): boolean {
    return !!(
      this.props.focus !== "inactive" &&
      this.composerState.hoveredRect &&
      this.props.composerStore.hoveredContentEvaluation
    );
  }
}
