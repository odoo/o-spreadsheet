import * as owl from "@odoo/owl";
import { SpreadsheetEnv, UID } from "../../types";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
  <div class="o-collaborative-debug">
    <div t-foreach="env.getters.getRevisionLogs()" t-as="log" t-key="log.id" class="o-cd-log">
      <div t-esc="simplify(log.id)" t-on-click="activate(log.id)"/>
      <div>
        <t t-if="log.isRedo">
          <div>Redo - <t t-esc="simplify(log.toRevert)" t-on-click="activate(log.toRevert)"/></div>
        </t>
        <t t-elif="log.isUndo">
          <div>Undo - <t t-esc="simplify(log.toRevert)" t-on-click="activate(log.toRevert)"/></div>
        </t>
      </div>
      <div t-if="log.id === state.activeId">
        <div t-foreach="log.commands" t-as="command" t-key="command_index">
          <t t-esc="command.type"/>
        </div>
      </div>
    </div>
  </div>`;

const CSS = css/* scss */ `
  .o-collaborative-debug {
    .o-cd-log {
      border: 1px solid black;
      margin: 10px;
      padding: 5px;
    }
  }
`;
interface Props {}

interface State {
  activeId?: UID;
}

export class CollaborativeDebugPanel extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;

  state: State = useState({
    activeId: undefined,
  });

  simplify(text: string) {
    return text.substring(0, 6);
  }

  activate(id: UID) {
    this.state.activeId = id;
  }
}
