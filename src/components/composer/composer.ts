import * as owl from "@odoo/owl";
import { SELECTION_BORDER_COLOR } from "../../constants";
import { EnrichedToken } from "../../formulas/index";
import { functionRegistry } from "../../functions/index";
import { DEBUG, isEqual, rangeReference, toZone } from "../../helpers/index";
import { ComposerSelection, SelectionIndicator } from "../../plugins/ui/edition";
import { FunctionDescription, Rect, SpreadsheetEnv } from "../../types/index";
import { TextValueProvider, TextValueProviderApi } from "./autocomplete_dropdown";
import { ContentEditableHelper } from "./content_editable_helper";
import { FunctionDescriptionProvider } from "./formula_assistant";
import { Dimension } from "./grid_composer";

const { Component } = owl;
const { useRef, useState, onMounted, onPatched, onWillUnmount } = owl.hooks;
const { xml, css } = owl.tags;
const functions = functionRegistry.content;

const ASSISTANT_WIDTH = 300;

export const FunctionColor = "#4a4e4d";
export const OperatorColor = "#3da4ab";
export const StringColor = "#f6cd61";
export const SelectionIndicatorColor = "darkgrey";
export const NumberColor = "#02c39a";
export const MatchingParenColor = "pink";

export const SelectionIndicatorClass = "selector-flag";

interface ComposerFocusedEventData {
  content?: string;
  selection?: ComposerSelection;
}

export type HtmlContent = {
  value: string;
  color?: string;
  class?: string;
};

export type ComposerFocusedEvent = CustomEvent<ComposerFocusedEventData>;

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

const TEMPLATE = xml/* xml */ `
<div class="o-composer-container">
  <div
    t-att-class="{ 'o-composer': true, 'text-muted': getters.isReadonly(), 'unfocusable': getters.isReadonly() }"
    t-att-style="props.inputStyle"
    t-ref="o_composer"
    tabindex="1"
    t-att-contenteditable="getters.isReadonly() ? 'false' : 'true'"
    spellcheck="false"

    t-on-keydown="onKeydown"
    t-on-mousedown="onMousedown"
    t-on-input="onInput"
    t-on-keyup="onKeyup"
    t-on-click.stop="onClick"
    t-on-blur="onBlur"
  />

  <div t-if="props.focus !== 'inactive' and (autoCompleteState.showProvider or functionDescriptionState.showDescription)"
    class="o-composer-assistant" t-att-style="assistantStyle">
    <TextValueProvider
        t-if="autoCompleteState.showProvider"
        exposeAPI="(api) => this.autocompleteAPI = api"
        search="autoCompleteState.search"
        provider="autoCompleteState.provider"
        onCompleted="(text) => this.onCompleted(text)"
        borderStyle="borderStyle"
    />
    <FunctionDescriptionProvider
        t-if="functionDescriptionState.showDescription"
        functionName = "functionDescriptionState.functionName"
        functionDescription = "functionDescriptionState.functionDescription"
        argToFocus = "functionDescriptionState.argToFocus"
        borderStyle="borderStyle"
    />
  </div>
</div>
  `;
const CSS = css/* scss */ `
  .o-composer-container {
    padding: 0;
    margin: 0;
    border: 0;
    z-index: 5;
    flex-grow: 1;
    max-height: inherit;
    .o-composer {
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
`;

interface Props {
  inputStyle: string;
  rect?: Rect;
  delimitation?: Dimension;
  focus: "inactive" | "cellFocus" | "contentFocus";
  onComposerUnmounted?: () => void;
  onComposerContentFocused: (selection: { start: number; end: number }) => void;
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

export class Composer extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { TextValueProvider, FunctionDescriptionProvider };
  static defaultProps = {
    inputStyle: "",
    focus: "inactive",
  };

  composerRef = useRef("o_composer");
  private autocompleteAPI?: TextValueProviderApi;

  getters = this.env.getters;
  dispatch = this.env.dispatch;

  contentHelper: ContentEditableHelper;

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

  get assistantStyle(): string {
    if (this.props.delimitation && this.props.rect) {
      const [cellX, cellY, , cellHeight] = this.props.rect;
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
    F4: () => console.warn("Not implemented"),
    Tab: (ev: KeyboardEvent) => this.processTabKey(ev),
  };

  constructor() {
    super(...arguments);
    this.contentHelper = new ContentEditableHelper(this.composerRef.el!);
  }

  setup() {
    onMounted(() => {
      DEBUG.composer = this;

      const el = this.composerRef.el!;

      this.contentHelper.updateEl(el);
      this.processContent();
    });

    onWillUnmount(() => {
      delete DEBUG.composer;
      this.props.onComposerUnmounted?.();
    });

    onPatched(() => {
      if (!this.isKeyStillDown) {
        this.processContent();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  private processArrowKeys(ev: KeyboardEvent) {
    if (this.getters.isSelectingForComposer()) {
      this.functionDescriptionState.showDescription = false;
      // Prevent the default content editable behavior which moves the cursor
      // but don't stop the event and let it bubble to the grid which will
      // update the selection accordingly
      ev.preventDefault();
      return;
    }
    if (this.props.focus === "cellFocus" && !this.autoCompleteState.showProvider) {
      return;
    }
    ev.stopPropagation();
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
  }

  private processTabKey(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
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
      this.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    }

    const deltaX = ev.shiftKey ? -1 : 1;
    this.dispatch("MOVE_POSITION", { deltaX, deltaY: 0 });
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
    this.dispatch("STOP_EDITION");
    this.dispatch("MOVE_POSITION", {
      deltaX: 0,
      deltaY: ev.shiftKey ? -1 : 1,
    });
  }

  private processEscapeKey() {
    this.dispatch("STOP_EDITION", { cancel: true });
  }

  onKeydown(ev: KeyboardEvent) {
    let handler = this.keyMapping[ev.key];
    if (handler) {
      handler.call(this, ev);
    } else {
      ev.stopPropagation();
    }
    const { start, end } = this.contentHelper.getCurrentSelection();
    if (!this.getters.isSelectingForComposer()) {
      this.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start, end });
      this.isKeyStillDown = true;
    }
  }

  /*
   * Triggered automatically by the content-editable between the keydown and key up
   * */
  onInput() {
    if (this.props.focus === "inactive" || !this.shouldProcessInputEvents) {
      return;
    }
    this.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    const el = this.composerRef.el! as HTMLInputElement;
    this.dispatch("SET_CURRENT_CONTENT", {
      content: el.childNodes.length ? el.textContent! : "",
      selection: this.contentHelper.getCurrentSelection(),
    });
  }

  onKeyup(ev: KeyboardEvent) {
    this.isKeyStillDown = false;
    if (this.props.focus === "inactive" || ["Control", "Shift", "Tab", "Enter"].includes(ev.key)) {
      return;
    }

    if (this.autoCompleteState.showProvider && ["ArrowUp", "ArrowDown"].includes(ev.key)) {
      return; // already processed in keydown
    }

    if (
      this.getters.isSelectingForComposer() &&
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
      this.dispatch("STOP_COMPOSER_RANGE_SELECTION");
      return;
    }

    const { start: oldStart, end: oldEnd } = this.getters.getComposerSelection();
    const { start, end } = this.contentHelper.getCurrentSelection();

    if (start !== oldStart || end !== oldEnd) {
      this.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", this.contentHelper.getCurrentSelection());
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
    if (this.getters.isReadonly()) {
      return;
    }
    const newSelection = this.contentHelper.getCurrentSelection();

    this.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    if (this.props.focus === "inactive") {
      this.props.onComposerContentFocused(newSelection);
    }
    this.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", newSelection);
    this.processTokenAtCursor();
  }

  onBlur() {
    this.isKeyStillDown = false;
  }

  onCompleted(text: string | undefined) {
    text && this.autoComplete(text);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private processContent() {
    this.contentHelper.removeAll(); // removes the content of the composer, to be added just after
    this.shouldProcessInputEvents = false;

    if (this.props.focus !== "inactive") {
      this.contentHelper.selectRange(0, 0); // move the cursor inside the composer at 0 0.
    }
    const content = this.getContent();
    if (content.length !== 0) {
      this.contentHelper.setText(content);
      const { start, end } = this.getters.getComposerSelection();

      if (this.props.focus !== "inactive") {
        // Put the cursor back where it was before the rendering
        this.contentHelper.selectRange(start, end);
      }
    }

    this.shouldProcessInputEvents = true;
  }

  private getContent(): HtmlContent[] {
    let content: HtmlContent[];
    let value = this.getters.getCurrentContent();
    if (value === "") {
      content = [];
    } else if (value.startsWith("=") && this.getters.getEditionMode() !== "inactive") {
      content = this.getColoredTokens();
    } else {
      content = [{ value }];
    }
    return content;
  }

  private getColoredTokens(): any[] {
    const tokens = this.getters.getCurrentTokens();
    const tokenAtCursor = this.getters.getTokenAtCursor();
    const result: any[] = [];
    const { end } = this.getters.getComposerSelection();
    for (let token of tokens) {
      switch (token.type) {
        case "OPERATOR":
        case "NUMBER":
        case "FUNCTION":
        case "COMMA":
        case "STRING":
          result.push({ value: token.value, color: tokenColor[token.type] || "#000" });
          break;
        case "REFERENCE":
          const [xc, sheet] = token.value.split("!").reverse() as [string, string | undefined];
          result.push({ value: token.value, color: this.rangeColor(xc, sheet) || "#000" });
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
      // Note: mode === waitingForRangeSelection implies end === start
      if (this.getters.getEditionMode() === "waitingForRangeSelection" && end === token.end) {
        result[result.length - 1].class = SelectionIndicatorClass;
      }
    }
    return result;
  }

  private rangeColor(xc: string, sheetName?: string): string | undefined {
    if (this.getters.getEditionMode() === "inactive") {
      return undefined;
    }
    const highlights = this.getters.getHighlights();
    const refSheet = sheetName
      ? this.getters.getSheetIdByName(sheetName)
      : this.getters.getEditionSheet();
    const highlight = highlights.find(
      (highlight) =>
        highlight.sheet === refSheet &&
        isEqual(this.getters.expandZone(refSheet, toZone(xc)), highlight.zone)
    );
    return highlight && highlight.color ? highlight.color : undefined;
  }

  /**
   * Compute the state of the composer from the tokenAtCursor.
   * If the token is a function or symbol (that isn't a cell/range reference) we have to initialize
   * the autocomplete engine otherwise we initialize the formula assistant.
   */
  private processTokenAtCursor(): void {
    let content = this.getters.getCurrentContent();
    this.autoCompleteState.showProvider = false;
    this.functionDescriptionState.showDescription = false;

    if (content.startsWith("=")) {
      const tokenAtCursor = this.getters.getTokenAtCursor();
      if (tokenAtCursor) {
        const [xc] = tokenAtCursor.value.split("!").reverse();
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
      const tokenAtCursor = this.getters.getTokenAtCursor();
      if (tokenAtCursor) {
        let start = tokenAtCursor.end;
        let end = tokenAtCursor.end;

        // shouldn't it be REFERENCE ?
        if (["SYMBOL", "FUNCTION"].includes(tokenAtCursor.type)) {
          start = tokenAtCursor.start;
        }

        const tokens = this.getters.getCurrentTokens();
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

        this.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
          start,
          end,
        });
      }

      this.dispatch("REPLACE_COMPOSER_CURSOR_SELECTION", {
        text: value,
      });
    }
    this.processTokenAtCursor();
  }
}
