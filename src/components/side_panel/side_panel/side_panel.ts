import { Component } from "@odoo/owl";
import { BUTTON_ACTIVE_BG, BUTTON_HOVER_BG, GRAY_300, TEXT_BODY } from "../../../constants";
import { SidePanelContent } from "../../../registries/side_panel_registry";
import { _t } from "../../../translation";
import { SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { SidePanelComponentProps } from "./side_panel_store";

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

    &.collapsed {
      padding: 8px;
      cursor: pointer;

      .o-sidePanelTitle {
        writing-mode: vertical-rl;
        text-orientation: mixed;
      }
    }

    .o-sidePanelTitle {
      line-height: 20px;
      font-size: 16px;
    }

    .o-sidePanelHeader {
      padding: 8px;
      border-bottom: 1px solid ${GRAY_300};
    }

    .o-sidePanelAction {
      padding: 5px 10px;
      cursor: pointer;

      &.active {
        background-color: ${BUTTON_ACTIVE_BG};
      }

      &:hover {
        background-color: ${BUTTON_HOVER_BG};
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

    .o-invalid {
      border-width: 2px;
      border-color: red;
    }

    .o-sidePanel-handle-container {
      width: 8px;
      position: fixed;
      top: 50%;
      z-index: 1;
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

  .o-fw-bold {
    font-weight: 500;
  }
`;

export interface SidePanelProps {
  panelContent: SidePanelContent;
  panelProps: SidePanelComponentProps;
  onCloseSidePanel: () => void;
  onStartHandleDrag: (ev: MouseEvent) => void;
  onResetPanelSize: () => void;
  isPinned?: boolean;
  onTogglePinPanel?: () => void;
  onToggleCollapsePanel?: () => void;
  isCollapsed?: boolean;
}

export class SidePanel extends Component<SidePanelProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SidePanel";
  static props = {
    panelContent: Object,
    panelProps: Object,
    onCloseSidePanel: Function,
    onStartHandleDrag: Function,
    onResetPanelSize: Function,
    isPinned: { type: Boolean, optional: true },
    onTogglePinPanel: { type: Function, optional: true },
    onToggleCollapsePanel: { type: Function, optional: true },
    isCollapsed: { type: Boolean, optional: true },
  };
  spreadsheetRect = useSpreadsheetRect();

  getTitle() {
    const panel = this.props.panelContent;
    return typeof panel.title === "function"
      ? panel.title(this.env, this.props.panelProps)
      : panel.title;
  }

  get pinInfoMessage() {
    return _t("Pin this panel to allow to open another side panel beside it.");
  }
}
