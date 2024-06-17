import { Component, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { FOOTER_HEIGHT, SCROLLBAR_WIDTH } from "../../constants";
import { LongRunner } from "../../helpers/long_runner";
import { SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers";

css/* scss */ `
  .o-progressBar-container {
    background-color: pink;
    height: 100px;
    width: 100px;
    position: absolute;
    right: ${SCROLLBAR_WIDTH}px;
    bottom: ${FOOTER_HEIGHT}px;
  }
  .o-progressBar {
    background-color: red;
  }
`;

interface ProgressBarContainerProps {
  longRunner: LongRunner;
}

export class ProgressBarContainer extends Component<
  ProgressBarContainerProps,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ProgressBarContainer";
  static props = {
    longRunner: Object,
  };
  private progressBars = useState<{ name: string; progress: number }[]>([]);

  setup() {
    onMounted(() => {
      this.props.longRunner.on("job-queued", this, (e) => {
        this.progressBars.push({ name: e.name, progress: 0 });
      });
      this.props.longRunner.on("job-started", this, (e) => {
        let progress = this.progressBars.find((x) => x.name === e.name);
        if (!progress) {
          this.progressBars.push({ name: e.name, progress: 0 });
        }
      });
      this.props.longRunner.on("job-continued", this, (e) => {
        let progress = this.progressBars.find((x) => x.name === e.name);
        if (!progress) {
          this.progressBars.push({ name: e.name, progress: e.progress });
        } else {
          progress.progress = e.progress;
        }
      });
      this.props.longRunner.on("job-done", this, (e) => {
        let progressIndex = this.progressBars.findIndex((x) => x.name === e.name);
        if (progressIndex !== -1) {
          this.progressBars.splice(progressIndex, 1);
        }
      });
    });
    onWillUnmount(() => {
      this.props.longRunner.off("job-queued", this);
      this.props.longRunner.off("job-started", this);
      this.props.longRunner.off("job-continued", this);
      this.props.longRunner.off("job-done", this);
    });
  }

  getStyle(progressBar) {
    return cssPropertiesToCss({
      width: progressBar.progress + "%",
    });
  }
}
