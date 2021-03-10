import * as owl from "@odoo/owl";
import { composerTokenize, EnrichedToken, rangeReference } from "../../formulas/index";
import { functionRegistry } from "../../functions/index";
import { DEBUG, zoneToXc } from "../../helpers/index";
import { ComposerSelection, SelectionIndicator } from "../../plugins/ui/edition";
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
export const NumberColor = "#02c39a";
export const MatchingParenColor = "pink";
export const SelectionIndicatorColor = "lightgrey";

interface ComposerFocusedEventData {
  content?: string;
  selection?: ComposerSelection;
}

export type ComposerFocusedEvent = CustomEvent<ComposerFocusedEventData>;

const tokenColor = {
  OPERATOR: OperatorColor,
  NUMBER: NumberColor,
  STRING: StringColor,
  BOOLEAN: NumberColor,
  FUNCTION: FunctionColor,
  DEBUGGER: OperatorColor,
  LEFT_PAREN: OperatorColor,
  RIGHT_PAREN: OperatorColor,
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
      t-on-beforeinput="onBeforeinput"
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
      />
      <FunctionDescriptionProvider
          t-if="functionDescriptionState.showDescription"
          t-ref="o_function_description_provider"
          functionName = "functionDescriptionState.functionName"
          functionDescription = "functionDescriptionState.functionDescription"
          argToFocus = "functionDescriptionState.argToFocus"
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
      padding-left: 2px;
      padding-right: 2px;
      word-break: break-all;
      &:focus {
        outline: none;
      }
    }
    .o-composer-assistant {
      position: absolute;
      margin: 4px;
      box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
      pointer-events: none;
    }
  }
`;

interface Props {
  inputStyle: string;
  rect?: Rect;
  delimitation?: Dimension;
  focus: boolean;
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

  mounted() {
    DEBUG.composer = this;

    const el = this.composerRef.el!;

    this.contentHelper.updateEl(el);
    this.processContent(this.props.focus);
  }

  willUnmount(): void {
    delete DEBUG.composer;
    this.trigger("composer-unmounted");
  }

  async willUpdateProps(nextProps: Props) {
    this.processContent(nextProps.focus);
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  private processArrowKeys(ev: KeyboardEvent) {
    if (this.getters.isSelectingForComposer()) {
      this.functionDescriptionState.showDescription = false;
      return;
    }
    ev.stopPropagation();
    const autoCompleteComp = this.autoCompleteRef.comp as TextValueProvider;
    if (
      ["ArrowUp", "ArrowDown"].includes(ev.key) &&
      this.autoCompleteState.showProvider &&
      autoCompleteComp
    ) {
      ev.preventDefault();
      if (ev.key === "ArrowUp") {
        autoCompleteComp.moveUp();
      } else {
        autoCompleteComp.moveDown();
      }
    }
  }

  private processTabKey(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const autoCompleteComp = this.autoCompleteRef.comp as TextValueProvider;
    if (this.autoCompleteState.showProvider && autoCompleteComp) {
      const autoCompleteValue = autoCompleteComp.getValueToFill();
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
    const autoCompleteComp = this.autoCompleteRef.comp as TextValueProvider;
    if (this.autoCompleteState.showProvider && autoCompleteComp) {
      const autoCompleteValue = autoCompleteComp.getValueToFill();
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
      return handler.call(this, ev);
    }
    ev.stopPropagation();
  }

  onBeforeinput() {
    this.dispatch("STOP_COMPOSER_RANGE_SELECTION");
  }

  /*
   * Triggered automatically by the content-editable between the keydown and key up
   * */
  onInput() {
    if (!this.props.focus || !this.shouldProcessInputEvents) {
      return;
    }
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

    this.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", this.contentHelper.getCurrentSelection());
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
    if (!this.props.focus) {
      this.trigger("composer-focused", {
        selection: this.contentHelper.getCurrentSelection(),
      });
    }
    this.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    this.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", this.contentHelper.getCurrentSelection());
    this.processTokenAtCursor();
  }

  onCompleted(ev: CustomEvent) {
    this.autoComplete(ev.detail.text);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private processContent(isFocused: boolean) {
    this.shouldProcessInputEvents = false;
    let value = this.getters.getCurrentContent();
    this.contentHelper.removeAll(); // remove the content of the composer, to be added just after
    if (isFocused) {
      this.contentHelper.selectRange(0, 0); // move the cursor inside the composer at 0 0.
    }
    const { start, end } = this.getters.getComposerSelection();
    if (value.startsWith("=")) {
      this.tokens = composerTokenize(value);
      const tokenAtCursor = this.getters.getTokenAtCursor();
      for (let token of this.tokens) {
        switch (token.type) {
          case "OPERATOR":
          case "NUMBER":
          case "FUNCTION":
          case "COMMA":
          case "BOOLEAN":
            this.contentHelper.insertText(token.value, this.tokenColor(token.type));
            break;
          case "SYMBOL":
            let value = token.value;
            const [xc, sheet] = value.split("!").reverse() as [string, string | undefined];
            if (rangeReference.test(xc)) {
              this.contentHelper.insertText(value, this.rangeColor(xc, sheet));
            } else {
              this.contentHelper.insertText(value, "#000");
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
              this.contentHelper.insertText(token.value, this.parenthesisColor());
            } else {
              this.contentHelper.insertText(token.value);
            }
            break;
          case "UNKNOWN":
            if (token.value === SelectionIndicator) {
              this.contentHelper.insertText(token.value, SelectionIndicatorColor);
            } else {
              this.contentHelper.insertText(token.value);
            }
            break;
          default:
            this.contentHelper.insertText(token.value);
            break;
        }
      }

      // Put the cursor back where it was
    } else {
      this.contentHelper.insertText(value);
    }
    if (isFocused) {
      this.contentHelper.selectRange(start, end);
    }
    if (this.composerRef.el!.clientWidth !== this.composerRef.el!.scrollWidth) {
      this.trigger("content-width-changed", {
        newWidth: this.composerRef.el!.scrollWidth,
      });
    }
    if (this.composerRef.el!.clientHeight !== this.composerRef.el!.scrollHeight) {
      this.trigger("content-height-changed", {
        newHeight: this.composerRef.el!.scrollHeight,
      });
    }
    this.shouldProcessInputEvents = true;
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

  private tokenColor(tokenType: string): string | undefined {
    return this.getters.getEditionMode() !== "inactive" ? tokenColor[tokenType] : undefined;
  }

  private parenthesisColor(): string | undefined {
    return this.getters.getEditionMode() !== "inactive" ? MatchingParenColor : undefined;
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

  private autoComplete(value: string) {
    if (value) {
      const tokenAtCursor = this.getters.getTokenAtCursor();
      if (tokenAtCursor) {
        let start = tokenAtCursor.end;
        let end = tokenAtCursor.end;

        if (["SYMBOL", "FUNCTION"].includes(tokenAtCursor.type)) {
          start = tokenAtCursor.start;
        }

        if (this.autoCompleteState.provider && this.tokens.length) {
          value += "(";

          const currentTokenIndex = this.tokens
            .map((token) => token.start)
            .indexOf(tokenAtCursor.start);
          if (currentTokenIndex + 1 < this.tokens.length) {
            const nextToken = this.tokens[currentTokenIndex + 1];
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
