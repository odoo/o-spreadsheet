import { Component, useEffect } from "@odoo/owl";
import { BACKGROUND_HEADER_COLOR, FILTERS_COLOR } from "../../../constants";
import { sidePanelRegistry } from "../../../registries/side_panel_registry";
import { Store, useStore } from "../../../store_engine";
import { SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { SidePanelStore } from "./side_panel_store";

css/* scss */ `
  .o-sidePanel {
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    background-color: white;
    border: 1px solid darkgray;
    user-select: none;
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
          color: dimgrey;
          font-weight: 500;
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

    .o-sidePanelButtons {
      padding: 16px;
      text-align: right;
    }

    .o-sidePanel-btn-link {
      font-size: 14px;
      padding: 20px 24px 11px 24px;
      height: 44px;
      cursor: pointer;
      text-decoration: none;
      &:hover {
        color: #003a39;
        text-decoration: none;
      }
    }

    .o-button.primary:not(.o-disabled) {
      background-color: ${FILTERS_COLOR};
      color: white;
      &:hover:enabled {
        opacity: 0.8;
        background-color: ${FILTERS_COLOR};
      }
    }

    input.o-required,
    select.o-required {
      border-color: #4c4c4c;
    }
    input.o-optional,
    select.o-optional {
      border: 1px solid #a9a9a9;
    }
    input.o-invalid {
      border-color: red;
    }
    select.o-input {
      background-color: white;
      text-align: left;
    }

    .o-inflection {
      table {
        table-layout: fixed;
        margin-top: 2%;
        display: table;
        text-align: left;
        font-size: 12px;
        line-height: 18px;
        width: 100%;
      }
      input,
      select {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
    }

    .o-sidePanel-tools {
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

        &:hover {
          background-color: rgba(0, 0, 0, 0.08);
        }
      }
    }
  }
`;

export class SidePanel extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SidePanel";
  static props = {};
  sidePanelStore!: Store<SidePanelStore>;

  setup() {
    this.sidePanelStore = useStore(SidePanelStore);
    useEffect(
      (isOpen) => {
        if (!isOpen) {
          this.sidePanelStore.close();
        }
      },
      () => [this.sidePanelStore.isOpen]
    );
  }

  get panel() {
    return sidePanelRegistry.get(this.sidePanelStore.componentTag);
  }

  close() {
    this.sidePanelStore.close();
  }

  getTitle() {
    const panel = this.panel;
    return typeof panel.title === "function" ? panel.title(this.env) : panel.title;
  }
}
