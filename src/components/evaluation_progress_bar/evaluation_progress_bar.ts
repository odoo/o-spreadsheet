import { Model } from "@odoo/o-spreadsheet-engine/model";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, onWillUnmount, useState } from "@odoo/owl";

interface Props {
  model: Model;
}

export class EvaluationProgressBar extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-EvaluationProgressBar";
  static props = { model: Object };

  state = useState({ progress: 1 });

  setup() {
    const onProgress = ({ progress }: { progress: number }) => {
      this.state.progress = progress;
    };
    onMounted(() => {
      this.props.model.on("evaluation-progress", this, onProgress);
    });
    onWillUnmount(() => {
      this.props.model.off("evaluation-progress", this);
    });
  }

  get isVisible(): boolean {
    return this.state.progress < 1;
  }

  get barStyle(): string {
    return `width: ${this.state.progress * 100}%`;
  }
}
