import * as owl from "@odoo/owl";
import * as icons from "../icons";
import { COLOR_PICKER, COLORS } from "../top_bar";
import { Model } from "../../model";
import { CellIsRule, Style, ConditionalFormat } from "../../types/index";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

export const PREVIEW_TEMPLATE = xml/* xml */ `
    <div class="o-cf-preview"
         t-attf-style="font-weight:{{currentStyle.bold ?'bold':'normal'}};
                       text-decoration:{{currentStyle.strikethrough ? 'line-through':'none'}};
                       font-style:{{currentStyle.italic?'italic':'normal'}};
                       color:{{currentStyle.textColor}};
                       background-color:{{currentStyle.fillColor}};"
         t-esc="previewText || 'Preview text'" />
`;

const TEMPLATE = xml/* xml */ `
<div class="o-cf-ruleEditor">
    <h2 t-if="props.mode ==='edit'">Edit rule</h2>
    <h2 t-if="props.mode ==='add'">Add a rule</h2>
    <h3>On ranges</h3>
    <input type="text" t-model="state.condition.ranges" placeholder="select range, ranges"/>
    <h3>Condition</h3>
    <select t-model="state.condition.operator">
        <t t-foreach="Object.keys(cellIsOperators)" t-as="op" t-key="op_index">
            <option t-att-value="op" t-esc="cellIsOperators[op]"/>
        </t>
    </select>
    <input type="text" t-model="state.condition.value1"/>
    <t t-if="state.condition.operator === 'Between' || state.condition.operator === 'NotBetween'">
        <input type="text" t-model="state.condition.value2"/>
    </t>
    <h3>Format</h3>

    <t t-call="${PREVIEW_TEMPLATE}">
        <t t-set="currentStyle" t-value="state.style"/>
    </t>
    <div class="o-tools">
        <div class="o-tool" title="Bold" t-att-class="{active:state.style.bold}" t-on-click="toggleTool('bold')">
            ${icons.BOLD_ICON}
        </div>
        <div class="o-tool" title="Italic" t-att-class="{active:state.style.italic}" t-on-click="toggleTool('italic')">
            ${icons.ITALIC_ICON}
        </div>
        <div class="o-tool" title="Strikethrough" t-att-class="{active:state.style.strikethrough}"
             t-on-click="toggleTool('strikethrough')">${icons.STRIKE_ICON}
        </div>
        <div class="o-tool o-dropdown o-with-color">
              <span title="Text Color" t-attf-style="border-color:{{state.style.textColor}}"
                    t-on-click.stop="toggleMenu('textColorTool')">${icons.TEXT_COLOR_ICON}</span>
            <div class="o-dropdown-content" t-if="state.textColorTool" t-on-click="setColor('textColor')">
                <t t-call="${COLOR_PICKER}"/>
            </div>
        </div>
        <div class="o-divider"/>
        <div class="o-tool  o-dropdown o-with-color">
              <span title="Fill Color" t-attf-style="border-color:{{state.style.fillColor}}"
                    t-on-click.stop="toggleMenu('fillColorTool')">${icons.FILL_COLOR_ICON}</span>
            <div class="o-dropdown-content" t-if="state.fillColorTool" t-on-click="setColor('fillColor')">
                <t t-call="${COLOR_PICKER}"/>
            </div>
        </div>
    </div>
    <div class="o-cf-buttons">
        <button t-on-click="onCancel">Cancel</button>
        <button t-on-click="onSave">Save</button>
    </div>
</div>
`;

const CSS = css/* scss */ `
  .o-cf-ruleEditor {
      .o-dropdown {
        position: relative;
        .o-dropdown-content {
          position: absolute;
          top: calc(100% + 5px);
          left: 0;
          z-index: 10;
          box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
          background-color: #f6f6f6;

          .o-dropdown-item {
            padding: 7px 10px;
          }
          .o-dropdown-item:hover {
            background-color: rgba(0, 0, 0, 0.08);
          }
          .o-dropdown-line {
            display: flex;
            padding: 3px 6px;
            .o-line-item {
              width: 16px;
              height: 16px;
              margin: 1px 3px;
              &:hover {
                background-color: rgba(0, 0, 0, 0.08);
              }
            }
          }
        }
      }

      .o-tools {
        color: #333;
        font-size: 13px;
        font-family: "Lato", "Source Sans Pro", Roboto, Helvetica, Arial, sans-serif;
        cursor: default;
        display: flex;

        .o-tool {
          display: flex;
          align-items: center;
          margin: 2px;
          padding: 0 3px;
          border-radius: 2px;
        }

        .o-tool.active,
        .o-tool:not(.o-disabled):hover {
          background-color: rgba(0, 0, 0, 0.08);
        }

        .o-with-color > span {
          border-bottom: 4px solid;
          height: 16px;
          margin-top: 2px;
        }
        .o-with-color {
          .o-line-item:hover {
            outline: 1px solid gray;
          }
        }
        .o-border {
          .o-line-item {
            padding: 4px;
            margin: 1px;
          }
        }
      }
      .o-cell-content {
        font-family: monospace, arial, sans, sans-serif;
        font-size: 12px;
        font-weight: 500;
        padding: 0 12px;
        margin: 0;
        line-height: 35px;
      }
    }
  }
`;
const cellIsOperators = {
  BeginsWith: "Begins with",
  Between: "Between",
  ContainsText: "Contains text",
  EndsWith: "Ends with",
  Equal: "Equal",
  GreaterThan: "Greater than",
  GreaterThanOrEqual: "Greater than or equal",
  LessThan: "Less than",
  LessThanOrEqual: "Less than or equal",
  NotBetween: "Not between",
  NotContains: "Not contains",
  NotEqual: "Not equal"
};

interface props {
  conditionalFormat: ConditionalFormat;
  model: Model;
}

export class ConditionalFormattingRuleEditor extends Component<props> {
  static template = TEMPLATE;
  static style = CSS;

  //@ts-ignore
  private cellIsOperators = cellIsOperators;
  COLORS = COLORS;

  model = this.props.model as Model;
  cf = this.props.conditionalFormat as ConditionalFormat;
  state = useState({
    condition: {
      ranges:
        this.cf && this.cf.ranges
          ? this.cf.ranges.join(",")
          : this.model.getters
              .getSelectedZones()
              .map(this.model.getters.zoneToXC)
              .join(","),
      operator:
        this.cf && (this.cf.formatRule.type as CellIsRule).operator
          ? (this.cf.formatRule.type as CellIsRule).operator
          : "Equal",
      value1:
        this.cf && (this.cf.formatRule.type as CellIsRule).values.length > 0
          ? (this.cf.formatRule.type as CellIsRule).values[0]
          : "",
      value2:
        this.cf && (this.cf.formatRule.type as CellIsRule).values.length > 1
          ? (this.cf.formatRule.type as CellIsRule).values[1]
          : ""
    },

    textColorTool: false,
    fillColorTool: false,
    style: {
      fillColor: this.cf && this.cf.style.fillColor,
      textColor: this.cf && this.cf.style.textColor,
      bold: this.cf && this.cf.style.bold,
      italic: this.cf && this.cf.style.italic,
      strikethrough: this.cf && this.cf.style.strikethrough
    }
  });

  willUpdateProps(nextProps: props): Promise<void> {
    if (nextProps.conditionalFormat) {
      this.state.condition.ranges = nextProps.conditionalFormat.ranges.join(",");

      this.state.condition.operator = (nextProps.conditionalFormat.formatRule
        .type as CellIsRule).operator;

      this.state.condition.value1 = (nextProps.conditionalFormat.formatRule
        .type as CellIsRule).values[0];
      this.state.condition.value2 =
        (nextProps.conditionalFormat.formatRule.type as CellIsRule).values.length > 1
          ? (nextProps.conditionalFormat.formatRule.type as CellIsRule).values[1]
          : "";

      this.state.style.fillColor = nextProps.conditionalFormat.style.fillColor;
      this.state.style.textColor = nextProps.conditionalFormat.style.textColor;
      this.state.style.bold = nextProps.conditionalFormat.style.bold;
      this.state.style.italic = nextProps.conditionalFormat.style.italic;
      this.state.style.strikethrough = nextProps.conditionalFormat.style.strikethrough;
    }
    this.state.textColorTool = false;
    this.state.fillColorTool = false;

    return super.willUpdateProps(nextProps);
  }

  toggleMenu(tool) {
    const isOpen = this.state[tool];
    this.closeMenus();
    this.state[tool] = !isOpen;
  }

  toggleTool(tool: string) {
    this.state.style[tool] = !this.state.style[tool];
    this.closeMenus();
  }
  setColor(target, ev) {
    const color = ev.target.dataset.color;
    if (color) {
      this.state.style[target] = color;
      this.closeMenus();
    }
  }
  closeMenus() {
    this.state.textColorTool = false;
    this.state.fillColorTool = false;
  }

  onSave() {
    const newStyle: Style = {};
    const style = this.state.style;
    if (style.bold !== undefined) {
      newStyle.bold = style.bold;
    }
    if (style.italic !== undefined) {
      newStyle.italic = style.italic;
    }
    if (style.strikethrough !== undefined) {
      newStyle.strikethrough = style.strikethrough;
    }
    if (style.fillColor) {
      newStyle.fillColor = style.fillColor;
    }
    if (style.textColor) {
      newStyle.textColor = style.textColor;
    }

    this.trigger("modifyRule", {
      ranges: this.state.condition.ranges.split(","),
      rule: {
        type: {
          kind: "CellIsRule",
          operator: this.state.condition.operator,
          values: [this.state.condition.value1, this.state.condition.value2]
        } as CellIsRule,
        stopIfTrue: false
      },
      style: newStyle
    });
  }
  onCancel() {
    this.trigger("cancelEdit", {});
  }
}
