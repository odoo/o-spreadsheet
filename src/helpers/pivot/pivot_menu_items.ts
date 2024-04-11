import { ActionSpec } from "../../actions/action";
import { _t } from "../../translation";

export const pivotProperties: ActionSpec = {
  name: _t("See pivot properties"),
  execute(env) {
    const position = env.model.getters.getActivePosition();
    const pivotId = env.model.getters.getPivotIdFromPosition(position);
    env.openSidePanel("PivotSidePanel", { pivotId });
  },
  isVisible: (env) => {
    const position = env.model.getters.getActivePosition();
    const pivotId = env.model.getters.getPivotIdFromPosition(position);
    return (pivotId && env.model.getters.isExistingPivot(pivotId)) || false;
  },
  icon: "o-spreadsheet-Icon.PIVOT",
};
