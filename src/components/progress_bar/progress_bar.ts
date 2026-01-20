import { UID } from "@odoo/o-spreadsheet-engine";
import { LongRunner } from "@odoo/o-spreadsheet-engine/helpers/long_runner";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { cssPropertiesToCss } from "../helpers";

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
    const progress = this.progressBars.find((x) => x.id === e.id);
    if (!progress) {
      this.progressBars.push({ id: e.id, name: e.name, progress: 0 });
    }
  }

  jobContinued(e) {
    const progress = this.progressBars.find((x) => x.id === e.id);
    if (!progress) {
      this.progressBars.push({ id: e.id, name: e.name, progress: e.progress });
    } else {
      progress.progress = e.progress;
    }
  }

  jobDone(e) {
    const progressIndex = this.progressBars.findIndex((x) => x.id === e.id);
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
