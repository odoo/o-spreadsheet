import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { Revision } from "../../../collaborative/revisions";
import { OperationSequenceNode, SpreadsheetChildEnv } from "../../../types/index";
import { UID } from "../../../types/misc";
import { css } from "../../helpers/css";

css/*scss*/ `
  .o-version-history-date {
    font-weight: bold;
  }
  .o-version-history-current-version {
    color: #0066ff;
    font-style: italic;
    font-size: 0.9rem;
  }
  .o-version-history-item {
    padding-left: 12px;
    padding-right: 12px;
    padding-top: 6px;
    padding-bottom: 6px;
  }
  .o-version-history-item:hover {
    background-color: rgba(0, 255, 0, 0.15);
    cursor: pointer;
  }
  .o-version-history-item:hover .o-version-history-date {
    color: green;
  }
`;

interface Props {
  onCloseSidePanel: () => void;
}

interface VersionHistoryState {
  currentlySelectedRevisionId: UID;
}

export class VersionHistory extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-VersionHistory";

  /* @ts-ignore => used in xml */
  private revisions: OperationSequenceNode<Revision>[] = [
    ...this.env.model
      .getSession()
      .getRevisions()
      .getTree()
      .revertedExecution(this.env.model.getSession().getRevisions().getHeadBranch()),
  ];
  private state: VersionHistoryState = useState({
    currentlySelectedRevisionId: this.env.model.getSession().getRevisions().getHeadOperation().id,
  });

  setup() {
    onWillUpdateProps(() => {
      this.revisions = [
        ...this.env.model
          .getSession()
          .getRevisions()
          .getTree()
          .revertedExecution(this.env.model.getSession().getRevisions().getHeadBranch()),
      ];
    });
  }

  formatDateFromTimestamp(unixTimespan) {
    const date = new Date(unixTimespan);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    };
    return date.toLocaleDateString(navigator.language, options);
  }

  onRevisionClick(revision) {
    this.state.currentlySelectedRevisionId = revision.operation.id;
    this.env.model.getSession().getRevisions().fastForward();
    this.env.model.getSession().getRevisions().revertTo(revision.operation.id);
    this.env.model.trigger("update");
  }
}
