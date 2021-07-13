import * as owl from "@odoo/owl";
import { EnrichedToken, rangeReference } from "../../formulas/index";
import { functionRegistry } from "../../functions/index";
import { DEBUG, zoneToXc } from "../../helpers/index";
import { ComposerSelection, SelectionIndicator } from "../../plugins/ui/edition";
import { composerKeybindsRegistry } from "../../registries/keybinds/composer_keybinds_registry";
import { FunctionDescription, Rect, SpreadsheetEnv } from "../../types/index";
import { TextValueProvider } from "./autocomplete_dropdown";
import { ContentEditableHelper } from "./content_editable_helper";
import { FunctionDescriptionProvider } from "./formula_assistant";
import { Dimension } from "./grid_composer";

const { Component } = owl;
const { useRef, useState } = owl.hooks;
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
  color: string;
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
  <div class="o-composer"
    t-att-style="props.inputStyle"
    t-ref="o_composer"
    tabindex="1"
    contenteditable="true"
    spellcheck="false"

    t-on-keydown="onKeydown"
    t-on-mousedown="onMousedown"
    t-on-input="onInput"
    t-on-keyup="onKeyup"
    t-on-click.stop="onClick"
  />

  <div t-if="props.focus and (autoCompleteState.showProvider or functionDescriptionState.showDescription)"
    class="o-composer-assistant" t-att-style="assistantStyle">
    <TextValueProvider
        t-if="autoCompleteState.showProvider"
        t-ref="o_autocomplete_provider"
        search="autoCompleteState.search"
        provider="autoCompleteState.provider"
        t-on-completed="onCompleted"
        borderStyle="borderStyle"
    />
    <FunctionDescriptionProvider
        t-if="functionDescriptionState.showDescription"
        t-ref="o_function_description_provider"
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
      padding-left: 8px;
      padding-right: 2px;
      word-break: break-all;
      &:focus {
        outline: none;
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
    box-shadow: 0px 0px 4px 5px rgba(60, 64, 67, 0.35);
  }
`;

interface Props {
  inputStyle: string;
  rect?: Rect;
  delimitation?: Dimension;
  focus: boolean;
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
    focus: false,
  };

  composerRef = useRef("o_composer");
  autoCompleteRef = useRef("o_autocomplete_provider");

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
    return "";
  }

  borderStyle = `box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);`;

  // we can't allow input events to be triggered while we remove and add back the content of the composer in processContent
  shouldProcessInputEvents: boolean = false;
  tokens: EnrichedToken[] = [];

  keybindHandlers = composerKeybindsRegistry;

  constructor() {
    super(...arguments);
    this.contentHelper = new ContentEditableHelper(this.composerRef.el!);
  }

  mounted() {
    DEBUG.composer = this;

    const el = this.composerRef.el!;

    this.contentHelper.updateEl(el);
    this.processContent();
  }

  willUnmount(): void {
    delete DEBUG.composer;
    this.trigger("composer-unmounted");
  }

  patched() {
    this.processContent();
  }

  onKeydown(ev: KeyboardEvent) {
    let handler = this.keybindHandlers.getHandler(ev);
    if (handler) {
      return handler.action(this, ev);
    }
    ev.stopPropagation();
  }

  /*
   * Triggered automatically by the content-editable between the keydown and key up
   * */
  onInput() {
    if (!this.props.focus || !this.shouldProcessInputEvents) {
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
    if (!this.props.focus || ["Control", "Shift", "Tab", "Enter"].includes(ev.key)) {
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
  }

  onMousedown(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    this.contentHelper.removeSelection();
  }

  onClick() {
    const newSelection = this.contentHelper.getCurrentSelection();

    this.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    if (!this.props.focus) {
      this.trigger("composer-focused", {
        selection: newSelection,
      });
    }
    this.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", newSelection);
    this.processTokenAtCursor();
  }

  onCompleted(ev: CustomEvent) {
    this.autoComplete(ev.detail.text);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private processContent() {
    this.contentHelper.removeAll(); // removes the content of the composer, to be added just after
    this.shouldProcessInputEvents = false;

    if (this.props.focus) {
      this.contentHelper.selectRange(0, 0); // move the cursor inside the composer at 0 0.
    }
    const content = this.getContent();
    if (content.length !== 0) {
      this.contentHelper.setText(content);
      const { start, end } = this.getters.getComposerSelection();

      if (this.props.focus) {
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
      content = [{ value, color: "#000" }];
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
        case "SYMBOL":
          let value = token.value;
          const [xc, sheet] = value.split("!").reverse() as [string, string | undefined];
          if (rangeReference.test(xc)) {
            result.push({ value: token.value, color: this.rangeColor(xc, sheet) || "#000" });
          } else if (["TRUE", "FALSE"].includes(value.toUpperCase())) {
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
        zoneToXc(highlight.zone) == xc.replace(/\$/g, "") && highlight.sheet === refSheet
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

          this.functionDescriptionState = {
            functionName: parentFunction,
            functionDescription: description,
            argToFocus: description.getArgToFocus(argPosition + 1) - 1,
            showDescription: true,
          };
        }
      }
    }
  }

  autoComplete(value: string) {
    if (value) {
      const tokenAtCursor = this.getters.getTokenAtCursor();
      if (tokenAtCursor) {
        let start = tokenAtCursor.end;
        let end = tokenAtCursor.end;

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
