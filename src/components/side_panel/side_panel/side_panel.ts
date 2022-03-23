import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { BACKGROUND_HEADER_COLOR } from "../../../constants";
import { SidePanelContent, sidePanelRegistry } from "../../../registries/side_panel_registry";
import { SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";

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

    .o-inflection {
      .o-inflection-icon-button {
        display: inline-block;
        border: 1px solid #dadce0;
        border-radius: 4px;
        cursor: pointer;
        padding: 1px 2px;
      }
      .o-inflection-icon-button:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
      table {
        table-layout: fixed;
        margin-top: 2%;
        display: table;
        text-align: left;
        font-size: 12px;
        line-height: 18px;
        width: 100%;
      }
      th.o-inflection-iconset-icons {
        width: 8%;
      }
      th.o-inflection-iconset-text {
        width: 28%;
      }
      th.o-inflection-iconset-operator {
        width: 14%;
      }
      th.o-inflection-iconset-type {
        width: 28%;
      }
      th.o-inflection-iconset-value {
        width: 26%;
      }
      input,
      select {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
    }

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
  }
`;

interface Props {
  component: string;
  panelProps: any;
  onCloseSidePanel: () => void;
}

interface State {
  panel: SidePanelContent;
}

export class SidePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.SidePanel";
  state!: State;

  setup() {
    this.state = useState({
      panel: sidePanelRegistry.get(this.props.component),
    });
    onWillUpdateProps(
      (nextProps: Props) => (this.state.panel = sidePanelRegistry.get(nextProps.component))
    );
  }

  getTitle() {
    return typeof this.state.panel.title === "function"
      ? this.state.panel.title(this.env)
      : this.state.panel.title;
  }
}
