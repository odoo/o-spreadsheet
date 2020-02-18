import * as owl from "@odoo/owl";

import { GridModel, Zone } from "../model";
import { toCartesian, zoneToXC } from "../helpers";
import { fontSizeMap } from "../fonts";
import { SCROLLBAR_WIDTH } from "../constants";
import { ComposerToken, composerTokenize } from "../formulas/composer_tokenizer";
import { rangeReference } from "../formulas/parser";
import { ContentEditableHelper } from "./content_editable_helper";
import { TextValueProvider } from "./autocomplete_dropdown";

const { Component } = owl;
const { useRef, useState } = owl.hooks;
const { xml, css } = owl.tags;

export const colors = [
  "#0074d9",
  "#7fdbff",
  "#39cccc",
  "#3d9970",
  "#0ecc40",
  "#01ff70",
  "#ffdc00",
  "#ff851b",
  "#ff4136",
  "#85144b",
  "#f012be",
  "#b10dc9",
  "#111111",
  "#aaaaaa",
  "#001f3f"
];

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
  RIGHT_PAREN: OperatorColor
};

const TEMPLATE = xml/* xml */ `
<div class="o-composer-container" t-att-style="style">
    <div class="o-composer"
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
    .o-composer {
      caret-color: black;
      box-sizing: border-box;
      background-color: white;
      padding-left: 2px;
      padding-right: 4px;
      border: 1.5px solid #3266ca;
      font-family: arial;
      white-space: nowrap;
      &:focus {
        outline: none;
      }
    }
  }
`;

export class Composer extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { TextValueProvider };

  composerRef = useRef("o_composer");
  autoCompleteRef = useRef("o_autocomplete_provider");

  model: GridModel = this.props.model;
  zone: Zone;
  selectionEnd: number = 0;
  selectionStart: number = 0;
  contentHelper: ContentEditableHelper;

  autoCompleteState = useState({
    showProvider: false,
    provider: "functions",
    search: ""
  });
  debug: boolean = false;
  tokenAtCursor: ComposerToken | void = undefined;

  // we can't allow input events to be triggered while we remove and add back the content of the composer in processContent
  shouldProcessInputEvents: boolean = false;
  // a composer edits a single cell. After that, it is done and should not
  // modify the model anymore.
  isDone: boolean = false;
  refSelectionStart: number = 0;
  tokens: ComposerToken[] = [];

  constructor() {
    super(...arguments);
    const model = this.model;
    this.contentHelper = new ContentEditableHelper(this.composerRef.el!);
    if (model.state.activeXc in model.state.mergeCellMap) {
      this.zone = model.state.merges[model.state.mergeCellMap[model.state.activeXc]];
    } else {
      const { activeCol, activeRow } = model.state;
      this.zone = { left: activeCol, top: activeRow, right: activeCol, bottom: activeRow };
    }
  }

  mounted() {
    // @ts-ignore
    //TODO VSC: remove this debug code
    window.composer = this;

    const { cols, rows } = this.model.state;
    const el = this.composerRef.el!;

    this.contentHelper.updateEl(el);
    if (this.model.state.currentContent) {
      this.contentHelper.insertText(this.model.state.currentContent);
      this.contentHelper.selectRange(
        this.model.state.currentContent.length,
        this.model.state.currentContent.length
      );
    }
    this.processContent();

    const width = cols[this.zone.right].right - cols[this.zone.left].left;
    el.style.width = Math.max(el.scrollWidth + 3, width + 0.5) as any;

    const height = rows[this.zone.bottom].bottom - rows[this.zone.top].top + 1;
    el.style.height = height as any;
  }

  willUnmount(): void {
    this.trigger("composer-unmounted");
  }

  get style() {
    const { cols, rows, offsetX, offsetY } = this.model.state;
    const col = cols[this.zone.left];
    const row = rows[this.zone.top];
    const height = rows[this.zone.bottom].bottom - row.top + 2;
    const top = row.top - offsetY + 1;
    const cell = this.model.selectedCell || { type: "text" };
    const style = this.model.style;
    const weight = `font-weight:${style.bold ? "bold" : 500};`;
    const sizeInPt = style.fontSize || 10;
    const size = fontSizeMap[sizeInPt];
    const italic = style.italic ? `font-style: italic;` : ``;
    const strikethrough = style.strikethrough ? `text-decoration:line-through;` : ``;
    const align = "align" in style ? style.align : cell.type === "number" ? "right" : "left";
    const position =
      align === "left"
        ? `left: ${col.left - offsetX}px;`
        : `right: ${this.model.state.clientWidth -
            (cols[this.zone.right].right - offsetX) -
            2 +
            SCROLLBAR_WIDTH}px;`;
    return `${position}top:${top}px;height:${height}px;line-height:${height -
      1}px;text-align:${align};font-size:${size}px;${weight}${italic}${strikethrough}`;
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  onKeydown(ev: KeyboardEvent) {
    // note: it is possible that this.autoCompleteState.showState has been set to true, and that
    // this.autoCompleteRef.comp has not yet been assigned, if the user types quickly and there was no render frame yet executed.
    const autoComplete = this.autoCompleteRef.comp as TextValueProvider;
    switch (ev.key) {
      case "Enter":
        ev.preventDefault();
        if (this.autoCompleteState.showProvider && autoComplete) {
          const autoCompleteValue = autoComplete.getValueToFill();
          if (autoCompleteValue) {
            this.saveSelection();
            this.autoComplete(autoCompleteValue);
            ev.stopPropagation();
            return;
          }
        }
        this.model.stopEditing();
        this.model.movePosition(0, ev.shiftKey ? -1 : 1);
        this.isDone = true;
        break;
      case "Escape":
        this.model.cancelEdition();
        this.isDone = true;
        break;
      case "Tab":
        ev.preventDefault();
        ev.stopPropagation();
        if (this.autoCompleteState.showProvider && autoComplete) {
          const autoCompleteValue = autoComplete.getValueToFill();
          if (autoCompleteValue) {
            this.saveSelection();
            this.autoComplete(autoCompleteValue);
            return;
          }
        } else {
          // when completing with tab, if there is no value to complete, the active cell will be moved to the right.
          // we can't let the model think that it is for a ref selection.
          this.model.setSelectingRange(false);
        }

        const deltaX = ev.shiftKey ? -1 : 1;
        this.isDone = true;
        this.model.movePosition(deltaX, 0);
        break;
      case "ArrowDown":
        ev.preventDefault();
        ev.stopPropagation();
        if (this.autoCompleteState.showProvider && autoComplete) {
          autoComplete.moveDown();
        }
        break;
      case "ArrowUp":
        ev.preventDefault();
        ev.stopPropagation();
        if (this.autoCompleteState.showProvider && autoComplete) {
          autoComplete.moveUp();
        }
        break;
    }
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
      el.style.width = (el.scrollWidth + 20) as any;
    }
    if (el.childNodes.length) {
      this.model.setCurrentContent(el.textContent!);
    } else {
      this.model.setCurrentContent("");
    }
  }

  onKeyup(ev: KeyboardEvent) {
    if (["Control", "ArrowUp", "ArrowDown", "Tab", "Enter"].includes(ev.key)) {
      // already processed in keydown
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();

    // reset the state of the ref selector and autocomplete for safety.
    // They will be set correctly if needed in `processTokenAtCursor`
    this.autoCompleteState.showProvider = false;
    this.autoCompleteState.search = "";
    this.model.setSelectingRange(false);
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
    this.model.setSelectingRange(false);
  }
  onCompleted(ev: CustomEvent) {
    this.saveSelection();
    this.autoComplete(ev.detail.text);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  processContent() {
    this.shouldProcessInputEvents = false;
    let value = this.model.state.currentContent;
    this.tokenAtCursor = undefined;
    if (value.startsWith("=")) {
      this.saveSelection();
      this.contentHelper.removeAll(); // remove the content of the composer, to be added just after
      this.contentHelper.selectRange(0, 0); // move the cursor inside the composer at 0 0.
      this.model.removeHighlights(); //cleanup highlights for references

      const refUsed = {};
      let lastUsedColorIndex = 0;

      this.tokens = composerTokenize(value);
      this.tokenAtCursor = this.tokens.find(
        t => t.start <= this.selectionStart! && t.end >= this.selectionEnd!
      );
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
            if (rangeReference.test(value)) {
              if (!refUsed[value]) {
                refUsed[value] = colors[lastUsedColorIndex];
                lastUsedColorIndex = ++lastUsedColorIndex % colors.length;
              }
              this.contentHelper.insertText(value, refUsed[value]);
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
      this.addHighlights(refUsed);
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
    } else if (["COMMA", "LEFT_PAREN", "OPERATOR"].includes(this.tokenAtCursor.type)) {
      this.model.setSelectingRange(true);
      // We set this variable to store the start of the selection, to allow
      // to replace selections (ex: select twice a cell should only be added
      // once)
      this.refSelectionStart = this.selectionStart;
    }
  }

  addHighlights(rangesUsed: {}) {
    let highlights = Object.keys(rangesUsed).map(r1c1 => {
      const ranges = r1c1.split(":");
      let top: number, bottom: number, left: number, right: number;

      let c = toCartesian(ranges[0].trim());
      left = right = c[0];
      top = bottom = c[1];
      if (ranges.length === 2) {
        let d = toCartesian(ranges[1].trim());
        right = d[0];
        bottom = d[1];
      }
      return { zone: { top, bottom, left, right }, color: rangesUsed[r1c1] };
    });
    this.model.addHighlights(
      highlights.filter(
        x =>
          x.zone.top >= 0 &&
          x.zone.left >= 0 &&
          x.zone.bottom < this.model.state.rows.length &&
          x.zone.right < this.model.state.cols.length
      )
    );
  }

  addText(text: string) {
    this.contentHelper.selectRange(this.selectionStart, this.selectionEnd);
    this.contentHelper.insertText(text);
    this.selectionStart = this.selectionEnd = this.selectionStart + text.length;
    this.contentHelper.selectRange(this.selectionStart, this.selectionEnd);
  }

  addTextFromSelection() {
    let newValue = zoneToXC(this.model.state.selection.zones[0]);
    if (this.refSelectionStart) {
      this.selectionStart = this.refSelectionStart;
    }
    this.addText(newValue);
    this.processContent();
  }

  autoComplete(value: string) {
    if (value) {
      if (this.tokenAtCursor && ["SYMBOL", "FUNCTION"].includes(this.tokenAtCursor.type)) {
        this.selectionStart = this.tokenAtCursor.start;
        this.selectionEnd = this.tokenAtCursor.end;
      }

      if (this.autoCompleteState.provider === "functions") {
        if (this.tokens.length && this.tokenAtCursor) {
          const currentTokenIndex = this.tokens.indexOf(this.tokenAtCursor);
          if (currentTokenIndex + 1 < this.tokens.length) {
            const nextToken = this.tokens[currentTokenIndex + 1];
            if (nextToken.type !== "LEFT_PAREN") {
              value += "(";
            }
          } else {
            value += "(";
          }
        }
      }
      this.addText(value);
    }
    this.autoCompleteState.search = "";
    this.autoCompleteState.showProvider = false;
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
