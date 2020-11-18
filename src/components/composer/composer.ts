import * as owl from "@odoo/owl";
import { EnrichedToken, composerTokenize, rangeReference } from "../../formulas/index";
import { SpreadsheetEnv } from "../../types/index";
import { TextValueProvider } from "./autocomplete_dropdown";
import { ContentEditableHelper } from "./content_editable_helper";
import { zoneToXc, DEBUG } from "../../helpers/index";
import { ComposerSelection } from "../../plugins/ui/edition";

const { Component } = owl;
const { useRef, useState } = owl.hooks;
const { xml, css } = owl.tags;

export const FunctionColor = "#4a4e4d";
export const OperatorColor = "#3da4ab";
export const StringColor = "#f6cd61";
export const NumberColor = "#02c39a";
export const MatchingParenColor = "pink";

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
      t-on-input="onInput"
      t-on-keyup="onKeyup"

      t-on-click.stop="onClick"
    />
    <TextValueProvider
        t-if="autoCompleteState.showProvider and props.focus"
        t-ref="o_autocomplete_provider"
        search="autoCompleteState.search"
        provider="autoCompleteState.provider"
        t-on-completed="onCompleted"
    />
</div>
  `;
const CSS = css/* scss */ `
  .o-composer-container {
    padding: 0;
    margin: 0;
    border: 0;
    z-index: 5;
    flex-grow: 1;
    .o-composer {
      caret-color: black;
      background-color: white;
      padding-left: 2px;
      padding-right: 2px;
      word-break: break-all;
      &:focus {
        outline: none;
      }
    }
  }
`;

interface Props {
  inputStyle: string;
  focus: boolean;
}

export class Composer extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { TextValueProvider };
  static defaultProps = {
    inputStyle: "",
    focus: false,
  };

  composerRef = useRef("o_composer");
  autoCompleteRef = useRef("o_autocomplete_provider");

  getters = this.env.getters;
  dispatch = this.env.dispatch;

  contentHelper: ContentEditableHelper;

  autoCompleteState = useState({
    showProvider: false,
    provider: "functions",
    search: "",
  });

  // we can't allow input events to be triggered while we remove and add back the content of the composer in processContent
  shouldProcessInputEvents: boolean = false;
  tokens: EnrichedToken[] = [];

  keyMapping: { [key: string]: Function } = {
    Enter: this.processEnterKey,
    Escape: this.processEscapeKey,
    Tab: (ev: KeyboardEvent) => this.processTabKey(ev),
    F2: () => console.warn("Not implemented"),
    F4: () => console.warn("Not implemented"),
    ArrowUp: this.processArrowKeys,
    ArrowDown: this.processArrowKeys,
    ArrowLeft: this.processArrowKeys,
    ArrowRight: this.processArrowKeys,
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
      this.dispatch("STOP_COMPOSER_SELECTION");
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

  /*
   * Triggered automatically by the content-editable between the keydown and key up
   * */
  onInput() {
    if (!this.props.focus || !this.shouldProcessInputEvents) {
      return;
    }
    const el = this.composerRef.el! as HTMLInputElement;
    const content = el.childNodes.length ? el.textContent! : "";
    this.dispatch("SET_CURRENT_CONTENT", {
      content,
      selection: this.contentHelper.getCurrentSelection(),
    });
  }

  onKeyup(ev: KeyboardEvent) {
    if (
      !this.props.focus ||
      ["Control", "Shift", "ArrowUp", "ArrowDown", "Tab", "Enter"].includes(ev.key)
    ) {
      // already processed in keydown
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();

    // reset the state of the ref selector and autocomplete for safety.
    // They will be set correctly if needed in `processTokenAtCursor`
    this.autoCompleteState.showProvider = false;
    this.autoCompleteState.search = "";
    if (ev.ctrlKey && ev.key === " ") {
      this.autoCompleteState.showProvider = true;
    } else if (
      ev.key === "ArrowLeft" ||
      ev.key === "ArrowRight" ||
      ev.key === "End" ||
      ev.key === "Home"
    ) {
      const { start, end } = this.contentHelper.getCurrentSelection();
      this.dispatch("CHANGE_COMPOSER_SELECTION", {
        start,
        end,
      });
    } else {
      this.dispatch("STOP_COMPOSER_SELECTION");
      this.processTokenAtCursor();
    }
  }

  onClick() {
    if (!this.props.focus) {
      this.trigger("composer-focused", {
        selection: this.contentHelper.getCurrentSelection(),
      });
    }
    this.dispatch("CHANGE_COMPOSER_SELECTION", this.contentHelper.getCurrentSelection());
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
              this.contentHelper.insertText(value);
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
   * If the token is a bool, function or symbol we have to initialize the autocomplete engine.
   * If it's a comma, left_paren or operator we have to initialize the range selection.
   */
  private processTokenAtCursor() {
    const tokenAtCursor = this.getters.getTokenAtCursor();
    const content = this.getters.getCurrentContent();
    if (!tokenAtCursor || !content.startsWith("=")) {
      return;
    }
    if (["BOOLEAN", "FUNCTION", "SYMBOL"].includes(tokenAtCursor.type)) {
      if (tokenAtCursor.value.length > 0) {
        this.autoCompleteState.search = tokenAtCursor.value;
        this.autoCompleteState.showProvider = true;
      }
    } else if (["COMMA", "LEFT_PAREN", "OPERATOR", "SPACE"].includes(tokenAtCursor.type)) {
      // we need to reset the anchor of the selection to the active cell, so the next Arrow key down
      // is relative the to the cell we edit
      this.dispatch("START_COMPOSER_SELECTION");
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

        this.dispatch("CHANGE_COMPOSER_SELECTION", {
          start,
          end,
        });
      }

      this.dispatch("REPLACE_COMPOSER_SELECTION", {
        text: value,
      });
    }

    this.autoCompleteState.search = "";
    this.autoCompleteState.showProvider = false;
    this.processTokenAtCursor();
  }
}
