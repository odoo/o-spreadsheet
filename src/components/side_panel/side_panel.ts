import { onWillRender, xml } from "@odoo/owl";
import { BACKGROUND_HEADER_COLOR } from "../../constants";
import { ConsumerComponent } from "../../stores/providers";
import { sidePanelProvider } from "../../stores/side_panel_store";
import { SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers/css";

const TEMPLATE = xml/* xml */ `
  <t t-esc="sidePanel.state.isOpen"/>
  <div class="o-sidePanel" t-if="sidePanel.state.isOpen">
    <div class="o-sidePanelHeader">
        <div class="o-sidePanelTitle" t-esc="sidePanel.state.title"/>
        <div class="o-sidePanelClose" t-on-click="close">×</div>
    </div>
    <div class="o-sidePanelBody">
      <t t-component="sidePanel.state.Body" t-props="sidePanel.state.panelProps" onCloseSidePanel="() => close()"/>
    </div>
    <div class="o-sidePanelFooter" t-if="sidePanel.state.Footer">
      <t t-component="sidePanel.state.Footer" t-props="sidePanel.state.panelProps"/>
    </div>
  </div>`;

css/* scss */ `
  .o-sidePanel {
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    background-color: white;
    border: 1px solid darkgray;
    .o-sidePanelHeader {
      padding: 6px;
      height: 30px;
      background-color: ${BACKGROUND_HEADER_COLOR};
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid darkgray;
      border-top: 1px solid darkgray;
      font-weight: bold;
      .o-sidePanelTitle {
        font-weight: bold;
        padding: 5px 10px;
        color: dimgrey;
      }
      .o-sidePanelClose {
        font-size: 1.5rem;
        padding: 5px 10px;
        cursor: pointer;
        &:hover {
          background-color: WhiteSmoke;
        }
      }
    }
    .o-sidePanelBody {
      overflow: auto;
      width: 100%;
      height: 100%;

      .o-section {
        padding: 16px;

        .o-section-title {
          font-weight: bold;
          color: dimgrey;
          margin-bottom: 5px;
        }

        .o-section-subtitle {
          color: gray;
          font-size: 12px;
          line-height: 14px;
          margin: 8px 0 4px 0;
        }

        .o-subsection-left {
          display: inline-block;
          width: 47%;
          margin-right: 3%;
        }

        .o-subsection-right {
          display: inline-block;
          width: 47%;
          margin-left: 3%;
        }
      }
    }

    .o-sidepanel-error {
      color: red;
      margin-top: 10px;
    }

    .o-sidePanelButtons {
      padding: 16px;
      text-align: right;
    }

    .o-sidePanelButton {
      border: 1px solid lightgrey;
      padding: 0px 20px 0px 20px;
      border-radius: 4px;
      font-weight: 500;
      font-size: 14px;
      height: 30px;
      line-height: 16px;
      background: white;
      margin-right: 8px;
      &:hover:enabled {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
    .o-sidePanelButton:enabled {
      cursor: pointer;
    }
    .o-sidePanelButton:last-child {
      margin-right: 0px;
    }

    .o-input {
      color: #666666;
      border-radius: 4px;
      min-width: 0px;
      padding: 4px 6px;
      box-sizing: border-box;
      line-height: 1;
      width: 100%;
      .o-type-selector {
        background-position: right 5px top 11px;
      }
    }
    input.o-required {
      border-color: #4c4c4c;
    }
    input.o-invalid {
      border-color: red;
    }
    select.o-input {
      background-color: white;
      text-align: left;
    }
  }
`;

interface Props {
  component: string;
  panelProps: any;
}

export class SidePanel extends ConsumerComponent<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;

  setup() {
    super.setup();
    onWillRender(() => console.log("will render"));
  }

  get sidePanel() {
    console.log("su");
    return this.providers.use(sidePanelProvider);
  }

  close() {
    debugger;
    this.sidePanel.notify.close();
  }
}
