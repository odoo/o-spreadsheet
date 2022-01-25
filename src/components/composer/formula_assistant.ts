import { Component, onWillUnmount, useState, xml } from "@odoo/owl";
import { FunctionDescription } from "../../types";
import { css } from "../helpers/css";
import { formulaAssistantTerms } from "./translation_terms";

// -----------------------------------------------------------------------------
// Formula Assistant component
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-formula-assistant-container"
       t-att-style="props.borderStyle"
       t-att-class="{
         'o-formula-assistant-event-none': assistantState.allowCellSelectionBehind,
         'o-formula-assistant-event-auto': !assistantState.allowCellSelectionBehind
         }">
    <t t-set="context" t-value="getContext()"/>
    <div class="o-formula-assistant" t-if="context.functionName" t-on-mousemove="onMouseMove"
         t-att-class="{'o-formula-assistant-transparency': assistantState.allowCellSelectionBehind}">

      <div class="o-formula-assistant-head">
        <span t-esc="context.functionName"/> (
        <t t-foreach="context.functionDescription.args" t-as="arg" t-key="arg.name" >
          <span t-if="arg_index > '0'" >, </span>
          <span t-att-class="{ 'o-formula-assistant-focus': context.argToFocus === arg_index }" >
            <span>
              <span t-if="arg.optional || arg.repeating || arg.default">[</span>
              <span t-esc="arg.name" />
              <span t-if="arg.repeating">, ...</span>
              <span t-if="arg.optional || arg.repeating || arg.default">]</span>
            </span>
          </span>
        </t> )
      </div>

      <div class="o-formula-assistant-core">
        <div class="o-formula-assistant-gray" t-esc="env._t('${formulaAssistantTerms.ABOUT}')"/>
        <div t-esc="context.functionDescription.description"/>
      </div>

      <t t-foreach="context.functionDescription.args" t-as="arg" t-key="arg.name">
        <div class="o-formula-assistant-arg"
            t-att-class="{
              'o-formula-assistant-gray': context.argToFocus >= '0',
              'o-formula-assistant-focus': context.argToFocus === arg_index,
            }" >
          <div>
            <span t-esc="arg.name" />
            <span t-if="arg.optional || arg.repeating || arg.default "> - [<t t-esc="env._t('${formulaAssistantTerms.OPTIONAL}')"/>] </span>
            <span t-if="arg.default">
              <t t-esc="arg.defaultValue" />
              <t t-esc="env._t(' ${formulaAssistantTerms.BY_DEFAULT}')"/>
            </span>
            <span t-if="arg.repeating" t-esc="env._t('${formulaAssistantTerms.REPEATABLE}')"/>
          </div>
          <div class="o-formula-assistant-arg-description" t-esc="arg.description"/>
        </div>
      </t>

    </div>
  </div>
`;

css/* scss */ `
  .o-formula-assistant {
    white-space: normal;
    background-color: #fff;
    .o-formula-assistant-head {
      background-color: #f2f2f2;
      padding: 10px;
    }
    .o-formula-assistant-core {
      padding: 0px 0px 10px 0px;
      margin: 10px;
      border-bottom: 1px solid gray;
    }
    .o-formula-assistant-arg {
      padding: 0px 10px 10px 10px;
      display: flex;
      flex-direction: column;
    }
    .o-formula-assistant-arg-description {
      font-size: 85%;
    }
    .o-formula-assistant-focus {
      div:first-child,
      span {
        color: purple;
        text-shadow: 0px 0px 1px purple;
      }
      div:last-child {
        color: black;
      }
    }
    .o-formula-assistant-gray {
      color: gray;
    }
  }
  .o-formula-assistant-container {
    user-select: none;
  }
  .o-formula-assistant-event-none {
    pointer-events: none;
  }
  .o-formula-assistant-event-auto {
    pointer-events: auto;
  }
  .o-formula-assistant-transparency {
    opacity: 0.3;
  }
`;

interface Props {
  functionName: string;
  functionDescription: FunctionDescription;
  argToFocus: number;
  borderStyle: string;
}

interface AssistantState {
  allowCellSelectionBehind: boolean;
}

export class FunctionDescriptionProvider extends Component<Props> {
  static template = TEMPLATE;

  assistantState: AssistantState = useState({
    allowCellSelectionBehind: false,
  });

  private timeOutId = 0;

  setup() {
    onWillUnmount(() => {
      if (this.timeOutId) {
        clearTimeout(this.timeOutId);
      }
    });
  }

  getContext(): Props {
    return this.props;
  }

  onMouseMove() {
    this.assistantState.allowCellSelectionBehind = true;
    if (this.timeOutId) {
      clearTimeout(this.timeOutId);
    }
    this.timeOutId = setTimeout(() => {
      this.assistantState.allowCellSelectionBehind = false;
    }, 2000) as unknown as number;
  }
}
