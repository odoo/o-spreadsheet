import * as owl from "@odoo/owl";
import { fontSizeMap } from "../../fonts";
import { composerTokenize, EnrichedToken, rangeReference } from "../../formulas/index";
import { colors, DEBUG, getComposerSheetName } from "../../helpers/index";
import { Rect, SpreadsheetEnv, Zone } from "../../types/index";
import { TextValueProvider } from "./autocomplete_dropdown";
import { ContentEditableHelper } from "./content_editable_helper";

const Component = owl.Component;
const { useRef, useState } = owl.hooks;
const { xml, css } = owl.tags;

export const FunctionColor = "#4a4e4d";
export const OperatorColor = "#3da4ab";
export const StringColor = "#f6cd61";
export const NumberColor = "#02c39a";
export const MatchingParenColor = "pink";

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
<div class="o-composer-container" t-att-style="containerStyle">
    <div class="o-composer"
      t-att-style="composerStyle"
      t-ref="o_composer"
      tabindex="1"
      contenteditable="true"
      spellcheck="false"

      t-on-keydown="onKeydown"
      t-on-input="onInput"
      t-on-keyup="onKeyup"

      t-on-blur="saveSelection"
      t-on-click="onClick"
    />
    <TextValueProvider
        t-if="autoCompleteState.showProvider"
        t-ref="o_autocomplete_provider"
        search="autoCompleteState.search"
        provider="autoCompleteState.provider"
        t-on-completed="onCompleted"
    />
</div>
  `;
const CSS = css/* scss */ `
  .o-composer-container {
    box-sizing: border-box;
    position: absolute;
    padding: 0;
    margin: 0;
    border: 0;
    z-index: 5;
    .o-composer {
      caret-color: black;
      box-sizing: border-box;
      background-color: white;
      padding-left: 2px;
      padding-right: 2px;
      border: 1.6px solid #3266ca;
      white-space: nowrap;
      &:focus {
        outline: none;
      }
    }
  }
`;

export class Composer extends Component<any, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { TextValueProvider };

  private composerRef = useRef("o_composer");
  private autoCompleteRef = useRef("o_autocomplete_provider");

  getters = this.env.getters;
  dispatch = this.env.dispatch;

  zone: Zone;
  rect: Rect;

  selectionEnd: number = 0;
  selectionStart: number = 0;
  contentHelper: ContentEditableHelper;

  autoCompleteState = useState({
    showProvider: false,
    provider: "functions",
    search: "",
  });
  tokenAtCursor: EnrichedToken | void = undefined;

  // we can't allow input events to be triggered while we remove and add back the content of the composer in processContent
  shouldProcessInputEvents: boolean = false;
  // a composer edits a single cell. After that, it is done and should not
  // modify the model anymore.
  isDone: boolean = false;
  refSelectionStart: number = 0;
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
    const [col, row] = this.getters.getPosition();
    this.zone = this.getters.expandZone({ left: col, right: col, top: row, bottom: row });
    this.rect = this.getters.getRect(this.zone, this.props.viewport);
  }

  mounted() {
    DEBUG.composer = this;

    const el = this.composerRef.el!;

    this.contentHelper.updateEl(el);
    const currentContent = this.getters.getCurrentContent();
    if (currentContent) {
      this.contentHelper.insertText(currentContent);
      this.contentHelper.selectRange(currentContent.length, currentContent.length);
    }
    this.processContent();

    el.style.width = (Math.max(el.scrollWidth + 10, this.rect[2] + 0.5) + "px") as string;
    el.style.height = (this.rect[3] + 0.5 + "px") as string;
  }

  willUnmount(): void {
    delete DEBUG.composer;
    this.trigger("composer-unmounted");
  }

  get containerStyle() {
    const style = this.getters.getCurrentStyle();
    const [x, y, , height] = this.rect;
    const weight = `font-weight:${style.bold ? "bold" : 500};`;
    const italic = style.italic ? `font-style: italic;` : ``;
    const strikethrough = style.strikethrough ? `text-decoration:line-through;` : ``;
    return `left: ${x - 1}px;
        top:${y}px;
        height:${height}px;
        font-size:${fontSizeMap[style.fontSize || 10]}px;
        ${weight}${italic}${strikethrough}`;
  }

  get composerStyle() {
    const style = this.getters.getCurrentStyle();
    const cell = this.getters.getActiveCell() || { type: "text" };
    const height = this.rect[3];
    const align = "align" in style ? style.align : cell.type === "number" ? "right" : "left";
    return `text-align:${align};
        line-height:${height - 1.5}px;`;
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  processArrowKeys(ev: KeyboardEvent) {
    if (this.getters.getEditionMode() === "selecting") {
      ev.preventDefault();
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

  processTabKey(ev: KeyboardEvent) {
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
    this.isDone = true;
    this.dispatch("MOVE_POSITION", { deltaX, deltaY: 0 });
  }

  processEnterKey(ev: KeyboardEvent) {
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
    this.isDone = true;
  }

  processEscapeKey() {
    this.dispatch("STOP_EDITION", { cancel: true });
    this.isDone = true;
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
  onInput(ev: KeyboardEvent) {
    if (this.isDone || !this.shouldProcessInputEvents) {
      return;
    }
    const el = this.composerRef.el! as HTMLInputElement;
    if (el.clientWidth !== el.scrollWidth) {
      el.style.width = `${el.scrollWidth + 20}px`;
    }
    const content = el.childNodes.length ? el.textContent! : "";
    this.dispatch("SET_CURRENT_CONTENT", { content });
  }

  onKeyup(ev: KeyboardEvent) {
    if (
      this.isDone ||
      [
        "Control",
        "Shift",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
        "Enter",
      ].includes(ev.key)
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
    this.dispatch("STOP_COMPOSER_SELECTION");
    if (ev.ctrlKey && ev.key === " ") {
      this.autoCompleteState.showProvider = true;
    } else {
      this.processContent();
      this.processTokenAtCursor();
    }
  }

  onClick(ev: MouseEvent) {
    ev.stopPropagation();
    this.processContent();
    this.processTokenAtCursor();
  }
  onCompleted(ev: CustomEvent) {
    this.autoComplete(ev.detail.text);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  processContent() {
    this.shouldProcessInputEvents = false;
    let value = this.getters.getCurrentContent();
    this.tokenAtCursor = undefined;
    if (value.startsWith("=")) {
      this.saveSelection();
      this.contentHelper.removeAll(); // remove the content of the composer, to be added just after
      this.contentHelper.selectRange(0, 0); // move the cursor inside the composer at 0 0.
      this.dispatch("REMOVE_ALL_HIGHLIGHTS"); //cleanup highlights for references

      const refUsed = {};
      let lastUsedColorIndex = 0;

      this.tokens = composerTokenize(value);
      if (this.selectionStart === this.selectionEnd && this.selectionEnd === 0) {
        this.tokenAtCursor = undefined;
      } else {
        this.tokenAtCursor = this.tokens.find(
          (t) => t.start <= this.selectionStart! && t.end >= this.selectionEnd!
        );
      }
      for (let token of this.tokens) {
        switch (token.type) {
          case "OPERATOR":
          case "NUMBER":
          case "FUNCTION":
          case "COMMA":
          case "BOOLEAN":
            this.contentHelper.insertText(token.value, tokenColor[token.type]);
            break;
          case "SYMBOL":
            let value = token.value;
            const [xc, sheet] = value.split("!").reverse();
            if (rangeReference.test(xc)) {
              const refSanitized =
                getComposerSheetName(
                  sheet
                    ? `${sheet}`
                    : `${this.getters.getSheetName(this.getters.getEditionSheet())}`
                ) +
                "!" +
                xc.replace(/\$/g, "");
              if (!refUsed[refSanitized]) {
                refUsed[refSanitized] = colors[lastUsedColorIndex];
                lastUsedColorIndex = ++lastUsedColorIndex % colors.length;
              }
              this.contentHelper.insertText(value, refUsed[refSanitized]);
            } else {
              this.contentHelper.insertText(value);
            }
            break;
          case "LEFT_PAREN":
          case "RIGHT_PAREN":
            // Compute the matching parenthesis
            if (
              this.tokenAtCursor &&
              ["LEFT_PAREN", "RIGHT_PAREN"].includes(this.tokenAtCursor.type) &&
              this.tokenAtCursor.parenIndex &&
              this.tokenAtCursor.parenIndex === token.parenIndex
            ) {
              this.contentHelper.insertText(token.value, MatchingParenColor);
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
      this.contentHelper.selectRange(this.selectionStart, this.selectionEnd);
      if (Object.keys(refUsed).length) {
        this.dispatch("ADD_HIGHLIGHTS", { ranges: refUsed });
      }
    }
    this.shouldProcessInputEvents = true;
  }

  /**
   * Compute the state of the composer from the tokenAtCursor.
   * If the token is a bool, function or symbol we have to initialize the autocomplete engine.
   * If it's a comma, left_paren or operator we have to initialize the range selection.
   */
  processTokenAtCursor() {
    if (!this.tokenAtCursor) {
      return;
    }
    if (["BOOLEAN", "FUNCTION", "SYMBOL"].includes(this.tokenAtCursor.type)) {
      if (this.tokenAtCursor.value.length > 0) {
        this.autoCompleteState.search = this.tokenAtCursor.value;
        this.autoCompleteState.showProvider = true;
      }
    } else if (["COMMA", "LEFT_PAREN", "OPERATOR", "SPACE"].includes(this.tokenAtCursor.type)) {
      // we need to reset the anchor of the selection to the active cell, so the next Arrow key down
      // is relative the to the cell we edit
      this.dispatch("START_COMPOSER_SELECTION");
      // We set this variable to store the start of the selection, to allow
      // to replace selections (ex: select twice a cell should only be added
      // once)
      this.refSelectionStart = this.selectionStart;
    }
  }

  addText(text: string) {
    this.contentHelper.selectRange(this.selectionStart, this.selectionEnd);
    this.contentHelper.insertText(text);
    this.selectionStart = this.selectionEnd = this.selectionStart + text.length;
    this.contentHelper.selectRange(this.selectionStart, this.selectionEnd);
  }

  addTextFromSelection() {
    const zone = this.getters.getSelectedZones()[0];
    let selection = this.getters.zoneToXC(zone);
    if (this.refSelectionStart) {
      this.selectionStart = this.refSelectionStart;
    }
    if (this.getters.getEditionSheet() !== this.getters.getActiveSheet()) {
      const sheetName = getComposerSheetName(
        this.getters.getSheetName(this.getters.getActiveSheet())!
      );
      selection = `${sheetName}!${selection}`;
    }
    this.addText(selection);
    this.processContent();
  }

  autoComplete(value: string) {
    this.saveSelection();
    if (value) {
      if (this.tokenAtCursor) {
        let start = this.tokenAtCursor.end;
        let end = this.tokenAtCursor.end;

        if (["SYMBOL", "FUNCTION"].includes(this.tokenAtCursor.type)) {
          start = this.tokenAtCursor.start;
        }

        if (this.autoCompleteState.provider && this.tokens.length) {
          value += "(";

          const currentTokenIndex = this.tokens
            .map((token) => token.start)
            .indexOf(this.tokenAtCursor.start);
          if (currentTokenIndex + 1 < this.tokens.length) {
            const nextToken = this.tokens[currentTokenIndex + 1];
            if (nextToken.type === "LEFT_PAREN") {
              end++;
            }
          }
        }
        this.selectionStart = start;
        this.selectionEnd = end;
      }
      this.addText(value);
    }

    this.autoCompleteState.search = "";
    this.autoCompleteState.showProvider = false;
    this.processContent();
    this.processTokenAtCursor();
  }

  /**
   * Save the current selection
   */
  saveSelection() {
    const selection = this.contentHelper.getCurrentSelection();
    this.selectionStart = selection.start;
    this.selectionEnd = selection.end;
  }
}
