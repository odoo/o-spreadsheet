import { Component, useEffect } from "@odoo/owl";
import { GRAY_300, TEXT_BODY, TEXT_BODY_MUTED } from "../../../constants";
import { sidePanelRegistry } from "../../../registries/side_panel_registry";
import { Store, useStore } from "../../../store_engine";
import { SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { startDnd } from "../../helpers/drag_and_drop";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { SidePanelStore } from "./side_panel_store";

css/* scss */ `
  .o-sidePanel {
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    background-color: white;
    border: solid ${GRAY_300};
    border-width: 1px 0 0 1px;
    user-select: none;
    color: ${TEXT_BODY};

    .o-text-muted {
      color: ${TEXT_BODY_MUTED};
    }

    .o-heading-3 {
      line-height: 20px;
      font-size: 16px;
      font-weight: 600;
    }

    .btn-link {
      text-decoration: none;
      color: #017e84;
      font-weight: 500;
      &:hover {
        color: #01585c;
      }
    }

    .o-sidePanelHeader {
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid ${GRAY_300};

      .o-sidePanelClose {
        padding: 5px 10px;
        cursor: pointer;
        &:hover {
          background-color: WhiteSmoke;
        }
      }
    }
    .o-sidePanelBody-container {
      /* This overwrites the min-height: auto; of flex. Without this, a flex div cannot be smaller than its children */
      min-height: 0;
    }
    .o-sidePanelBody {
      overflow: auto;
      width: 100%;
      height: 100%;

      .o-section {
        padding: 16px;

        .o-section-title {
          font-weight: 500;
          margin-bottom: 5px;
        }

        .o-section-subtitle {
          font-weight: 500;
          font-size: 13px;
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

      .o-sidePanel-composer {
        color: ${TEXT_BODY};
      }
    }

    .o-sidePanelButtons {
      display: flex;
      gap: 8px;
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

    .o-invalid {
      border-width: 2px;
      border-color: red;
    }

    .o-sidePanel-handle-container {
      width: 8px;
      position: fixed;
      top: 50%;
    }
    .o-sidePanel-handle {
      cursor: col-resize;
      color: #a9a9a9;
      .o-icon {
        height: 25px;
        margin-left: -5px;
      }
    }
  }
`;

export class SidePanel extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SidePanel";
  static props = {};
  sidePanelStore!: Store<SidePanelStore>;
  spreadsheetRect = useSpreadsheetRect();

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
    return typeof panel.title === "function"
      ? panel.title(this.env, this.sidePanelStore.panelProps)
      : panel.title;
  }

  startHandleDrag(ev: MouseEvent) {
    const startingCursor = document.body.style.cursor;
    const startSize = this.sidePanelStore.panelSize;
    const startPosition = ev.clientX;
    const onMouseMove = (ev: MouseEvent) => {
      document.body.style.cursor = "col-resize";
      const newSize = startSize + startPosition - ev.clientX;
      this.sidePanelStore.changePanelSize(newSize, this.spreadsheetRect.width);
    };
    const cleanUp = () => {
      document.body.style.cursor = startingCursor;
    };
    startDnd(onMouseMove, cleanUp);
  }
}
