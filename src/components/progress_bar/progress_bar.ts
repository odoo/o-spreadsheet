import { Component, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { SCROLLBAR_WIDTH } from "../../constants";
import { LongRunner } from "../../helpers/long_runner";
import { SpreadsheetChildEnv, UID } from "../../types";
import { css, cssPropertiesToCss } from "../helpers";

css/* scss */ `
  .o-progressBar-container {
    position: absolute;
    right: ${SCROLLBAR_WIDTH}px;
    bottom: 52px;
    min-width: 200px;
    .o-progressBar {
      .o-progressBar-text {
        text-wrap: nowrap;
        text-overflow: ellipsis;
      }
    }
  }
`;

interface ProgressBarProps {
  longRunner: LongRunner;
}

export class SpreadsheetProgressBar extends Component<ProgressBarProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ProgressBar";
  static props = {
    longRunner: Object,
  };
  private progressBars = useState<{ id: UID; name: string; progress: number }[]>([]);

  setup() {
    onMounted(() => {
      this.props.longRunner.on("job-queued", this, this.jobQueued);
      this.props.longRunner.on("job-started", this, this.jobStarted);
      this.props.longRunner.on("job-continued", this, this.jobContinued);
      this.props.longRunner.on("job-done", this, this.jobDone);
    });
    onWillUnmount(() => {
      this.props.longRunner.off("job-queued", this);
      this.props.longRunner.off("job-started", this);
      this.props.longRunner.off("job-continued", this);
      this.props.longRunner.off("job-done", this);
    });
  }

  jobQueued(e) {
    this.progressBars.push({ id: e.id, name: e.name, progress: 0 });
  }

  jobStarted(e) {
    let progress = this.progressBars.find((x) => x.id === e.id);
    if (!progress) {
      this.progressBars.push({ id: e.id, name: e.name, progress: 0 });
    }
  }

  jobContinued(e) {
    let progress = this.progressBars.find((x) => x.id === e.id);
    if (!progress) {
      this.progressBars.push({ id: e.id, name: e.name, progress: e.progress });
    } else {
      progress.progress = e.progress;
    }
  }

  jobDone(e) {
    let progressIndex = this.progressBars.findIndex((x) => x.id === e.id);
    if (progressIndex !== -1) {
      this.progressBars.splice(progressIndex, 1);
    }
  }

  getStyle(progressBar) {
    return cssPropertiesToCss({
      width: progressBar.progress + "%",
    });
  }
}
