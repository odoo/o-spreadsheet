import * as owl from "@odoo/owl";
import { SpreadsheetEnv, Command } from "../../types/index";

const { Component } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
  <div class="o-debug">
    <div t-foreach="getters.getDebugSteps()" t-as="step" class="o-section" t-key="display(step)">
      <t t-if="step.type === 'command'">
        <t t-set="mainCommand" t-value="step.commands[step.commands.length-1]"/>
        <t t-set="subCommands" t-value="step.commands.slice(0, -1)"/>
        <div t-esc="mainCommand.type"/>
        <div t-esc="displayPayload(mainCommand)" t-att-title="displayPayload(mainCommand)" class="command-payload"/>
        <div
          t-foreach="subCommands"
          t-as="subcommand"
          t-key="display(subcommand)"
          class="o-subcommand">
          <span t-esc="subcommand.type" t-att-title="display(subcommand)"/>
          <span t-esc="displayPayload(subcommand)" t-att-title="displayPayload(subcommand)" class="command-payload"/>
        </div>
      </t>
      <t t-if="step.type === 'network-message'">
        <div>
          ⬇️ <t t-esc="step.message.clientId"/>
        </div>
        <div t-foreach="step.message.updates" t-as="update" t-key="display(step.message)" class="update">
          <t t-esc="display(update)"/>
        </div>
      </t>
    </div>
  </div>
`;
const CSS = css/* scss */ `
  .o-debug {
    .o-subcommand,
    .update {
      font-size: 10px;
      padding: 1px;
    }
    .command-payload {
      color: #888;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;
export class DebugPanel extends Component<any, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  getters = this.env.getters;

  display(object: any): string {
    return JSON.stringify(object);
  }

  displayPayload(command: Command) {
    const copy = { ...command };
    delete copy["type"];
    return this.display(copy);
  }
}
