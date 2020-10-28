import * as owl from "@odoo/owl";
import { FunctionDescription } from "../../types";
import { formulaAssistantTerms } from "./translation_terms";

const { Component } = owl;
const { xml, css } = owl.tags;

// -----------------------------------------------------------------------------
// Formula Assistant component
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div>
    <t t-set="context" t-value="getContext()"/>
    <div class="o-formula-assistant" t-if="context.functionName" >

      <div class="o-formula-assistant-head">
        <span t-esc="context.functionName"/> (
        <t t-foreach="context.functionDescription.args" t-as="arg" t-key="arg.name" >
          <span t-if="arg_index > '0'" >, </span>
          <span t-att-class="{ 'o-formula-assistant-focus': context.argToFocus === arg_index }" >
            <span>
              <span t-if="arg.optional">[</span>
              <span t-esc="arg.name" />
              <span t-if="arg.repeating">, ...</span>
              <span t-if="arg.optional">]</span>
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
            <span t-if="arg.optional"> - [<t t-esc="env._t('${formulaAssistantTerms.OPTIONAL}')"/>] </span>
            <span t-if="arg.default !== undefined">
              <t t-esc="arg.default" />
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

const CSS = css/* scss */ `
  .o-formula-assistant {
    width: 300px;
    background-color: #fff;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    margin: 4px;
    white-space: normal;
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
`;

interface Props {
  functionName: string;
  functionDescription: FunctionDescription;
  argToFocus: number;
}

export class FunctionDescriptionProvider extends Component<Props> {
  static template = TEMPLATE;
  static style = CSS;

  getContext(): Props {
    return this.props;
  }
}
