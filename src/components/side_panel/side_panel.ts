import * as owl from "@odoo/owl";

const { Component } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
<div class="o-sidePanel" >
  <div class="o-sidePanelHeader">
      <div class="o-sidePanelTitle">
          <t t-esc="props.title" />
      </div>
      <div class="o-sidePanelClose" t-on-click="trigger('close-side-panel')">x</div>
  </div>
  <div class="o-sidePanelBody">
     <t t-component="props.Body" model="props.model"/>
  </div>
  <div class="o-sidePanelFooter" t-if="props.Footer">
     <t t-component="props.Footer" model="props.model"/>
  </div>
</div>
  `;

const CSS = css/* scss */ `
  .o-sidePanel {
    position: absolute;
    top: 72px;
    right: 25px;
    bottom: 57px;
    overflow-x: hidden;
    background-color: white;
    box-shadow: -4px -4px 5px 0px rgba(0, 0, 0, 0.64);
    min-width: 200px;
    max-width: 350px;
    .o-sidePanelHeader {
      padding: 6px;
      height: 41px;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid darkgray;
      .o-sidePanelTitle {
        padding-top: 11px;
      }
      .o-sidePanelClose {
        padding: 11px 15px;
        cursor: hand;
        &:hover {
          background-color: darkgray;
        }
      }
    }
    .o-sidePanelBody {
      padding: 6px;
    }
    .o-sidePanelFooter {
      padding: 6px;
    }
  }
`;

export class SidePanel extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;
}
