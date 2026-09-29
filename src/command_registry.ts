import {
  inverseAddColumnsRows,
  inverseAddMerge,
  inverseAddPivot,
  inverseCreateChart,
  inverseCreateFigure,
  inverseCreateSheet,
  inverseCreateTableStyle,
  inverseDeleteSheet,
  inverseDuplicateSheet,
  inverseHideColumnsRows,
  inverseLockSheet,
  inverseRemoveColumnsRows,
  inverseRemoveMerge,
  inverseRenameSheet,
  inverseUnhideColumnsRows,
  inverseUnlockSheet,
} from "./registries/inverse_commands";
import { Registry } from "./registries/registry";
import type {
  Command,
  CommandTypes,
  CoreCommand,
  CoreCommandTypes,
  DispatcheableEvaluationCommand,
  DispatcheabledispatcheableEvaluationCommandTypes,
  EvaluationCommand,
} from "./types/commands";

// -----------------------------------------------------------------------------
// Command sets
// -----------------------------------------------------------------------------

export const coreCommands = new Set<CoreCommandTypes>();
export const localCommands = new Set<CommandTypes>();
export const allCommands = new Set<CommandTypes>();
export const evaluationCommandTypes = new Set<CommandTypes>();
export const dispatcheableEvaluationCommandTypes =
  new Set<DispatcheabledispatcheableEvaluationCommandTypes>(["EVALUATE_CELLS", "EVALUATE_CHARTS"]);
export const invalidateEvaluationCommands = new Set<CommandTypes>();
export const invalidateChartEvaluationCommands = new Set<CommandTypes>();
export const invalidateDependenciesCommands = new Set<CommandTypes>();
export const invalidateCFEvaluationCommands = new Set<CommandTypes>();
export const invalidateTableStyleCommands = new Set<CommandTypes>();
export const invalidateBordersCommands = new Set<CommandTypes>();
export const invalidSubtotalFormulasCommands = new Set<CommandTypes>();
export const readonlyAllowedCommands = new Set<CommandTypes>();
export const lockedSheetAllowedCommands = new Set<CommandTypes>();

export const commandSets = {
  "*invalidateEvaluationCommands": invalidateEvaluationCommands,
  "*invalidateChartEvaluationCommands": invalidateChartEvaluationCommands,
  "*invalidateDependenciesCommands": invalidateDependenciesCommands,
  "*invalidateCFEvaluationCommands": invalidateCFEvaluationCommands,
  "*invalidateTableStyleCommands": invalidateTableStyleCommands,
  "*invalidateBordersCommands": invalidateBordersCommands,
  "*invalidSubtotalFormulasCommands": invalidSubtotalFormulasCommands,
  "*readonlyAllowedCommands": readonlyAllowedCommands,
  "*lockedSheetAllowedCommands": lockedSheetAllowedCommands,
  "*coreCommands": coreCommands,
  "*localCommands": localCommands,
  "*evaluationCommandTypes": evaluationCommandTypes,
  "*allCommands": allCommands,
} satisfies Record<string, Set<CommandTypes>>;

export type CommandSetName = keyof typeof commandSets;

export function isCommandSetName(key: string): key is CommandSetName {
  return key in commandSets;
}

type InverseFunction = (cmd: CoreCommand) => CoreCommand[];

export const inverseCommandRegistry = new Registry<InverseFunction>();

// -----------------------------------------------------------------------------
// registerCommand
// -----------------------------------------------------------------------------

interface CommandBehaviours {
  invalidatesEvaluation?: boolean;
  invalidatesChartEvaluation?: boolean;
  invalidatesDependencies?: boolean;
  invalidatesConditionalFormatEvaluation?: boolean;
  invalidatesTableStyle?: boolean;
  invalidatesBorders?: boolean;
  invalidatesSubtotalFormulas?: boolean;
  allowedInReadonly?: boolean;
  allowedOnLockedSheet?: boolean;
}

const behaviourSets = {
  invalidatesEvaluation: invalidateEvaluationCommands,
  invalidatesChartEvaluation: invalidateChartEvaluationCommands,
  invalidatesDependencies: invalidateDependenciesCommands,
  invalidatesConditionalFormatEvaluation: invalidateCFEvaluationCommands,
  invalidatesTableStyle: invalidateTableStyleCommands,
  invalidatesBorders: invalidateBordersCommands,
  invalidatesSubtotalFormulas: invalidSubtotalFormulasCommands,
  allowedInReadonly: readonlyAllowedCommands,
  allowedOnLockedSheet: lockedSheetAllowedCommands,
} satisfies Required<{ [key in keyof CommandBehaviours]: Set<CommandTypes> }>;

interface CoreCommandOptions<T extends CommandTypes> extends CommandBehaviours {
  category: "core";
  inverse?: (cmd: Extract<CoreCommand, { type: T }>) => CoreCommand[];
}

interface LocalCommandOptions extends CommandBehaviours {
  category: "local";
  isEvaluationCommand?: boolean;
  isDispatcheableEvaluationCommand?: boolean;
}

export type CommandRegistrationOptions<T extends CommandTypes> =
  | CoreCommandOptions<T>
  | LocalCommandOptions;

/**
 * Register a command and declare its behaviour. This is the single entry point
 * to add a command: it adds it to every command set it belongs to.
 */
export function registerCommand<T extends CommandTypes>(
  type: T,
  options: CommandRegistrationOptions<T>
): void {
  if (allCommands.has(type)) {
    throw new Error(`The command "${type}" is already registered`);
  }
  if (options.category === "core") {
    coreCommands.add(type as CoreCommandTypes);
    evaluationCommandTypes.add(type);
    inverseCommandRegistry.add(type, (options.inverse ?? identity) as InverseFunction);
  } else {
    localCommands.add(type);
    if (options.isEvaluationCommand || options.isDispatcheableEvaluationCommand) {
      evaluationCommandTypes.add(type);
    }
  }
  allCommands.add(type);
  for (const behaviour in behaviourSets) {
    if (options[behaviour]) {
      behaviourSets[behaviour].add(type);
    }
  }
}

function identity(cmd: CoreCommand): CoreCommand[] {
  return [cmd];
}

export function isCoreCommand(cmd: Command): cmd is CoreCommand {
  return coreCommands.has(cmd.type as any);
}

export function isDispatcheableEvaluationCommand(
  cmd: Command
): cmd is DispatcheableEvaluationCommand {
  return dispatcheableEvaluationCommandTypes.has(cmd.type as any);
}

export function isEvaluationCommand(cmd: Command): cmd is EvaluationCommand {
  return evaluationCommandTypes.has(cmd.type as any);
}

export function canExecuteInReadonly(cmd: Command): boolean {
  return readonlyAllowedCommands.has(cmd.type);
}

//#region Core Commands
// -----------------------------------------------------------------------------
// Core commands
// -----------------------------------------------------------------------------

// CELLS
registerCommand("UPDATE_CELL", {
  category: "core",
  invalidatesChartEvaluation: true,
});
registerCommand("UPDATE_CELL_POSITION", { category: "core" });
registerCommand("CLEAR_CELL", { category: "core" });
registerCommand("CLEAR_CELLS", { category: "core" });
registerCommand("DELETE_CONTENT", {
  category: "core",
  invalidatesTableStyle: true,
});

// GRID SHAPE
registerCommand("ADD_COLUMNS_ROWS", {
  category: "core",
  invalidatesEvaluation: true,
  inverse: inverseAddColumnsRows,
});
registerCommand("REMOVE_COLUMNS_ROWS", {
  category: "core",
  invalidatesEvaluation: true,
  inverse: inverseRemoveColumnsRows,
});
registerCommand("RESIZE_COLUMNS_ROWS", { category: "core" });
registerCommand("HIDE_COLUMNS_ROWS", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
  inverse: inverseHideColumnsRows,
});
registerCommand("UNHIDE_COLUMNS_ROWS", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
  inverse: inverseUnhideColumnsRows,
});
registerCommand("SET_GRID_LINES_VISIBILITY", { category: "core" });
registerCommand("UNFREEZE_COLUMNS", { category: "core" });
registerCommand("UNFREEZE_ROWS", { category: "core" });
registerCommand("FREEZE_COLUMNS", { category: "core" });
registerCommand("FREEZE_ROWS", { category: "core" });
registerCommand("UNFREEZE_COLUMNS_ROWS", { category: "core" });

// MERGE
registerCommand("ADD_MERGE", {
  category: "core",
  invalidatesEvaluation: true,
  inverse: inverseAddMerge,
});
registerCommand("REMOVE_MERGE", {
  category: "core",
  invalidatesEvaluation: true,
  inverse: inverseRemoveMerge,
});

// SHEETS MANIPULATION
registerCommand("CREATE_SHEET", {
  category: "core",
  invalidatesEvaluation: true,
  allowedOnLockedSheet: true,
  inverse: inverseCreateSheet,
});
registerCommand("DELETE_SHEET", {
  category: "core",
  invalidatesEvaluation: true,
  inverse: inverseDeleteSheet,
});
registerCommand("DUPLICATE_SHEET", {
  category: "core",
  invalidatesEvaluation: true,
  allowedOnLockedSheet: true,
  inverse: inverseDuplicateSheet,
});
registerCommand("MOVE_SHEET", {
  category: "core",
  allowedOnLockedSheet: true,
});
registerCommand("RENAME_SHEET", {
  category: "core",
  invalidatesEvaluation: true,
  inverse: inverseRenameSheet,
});
registerCommand("COLOR_SHEET", { category: "core" });
registerCommand("SET_SHEET_BACKGROUND_COLOR", { category: "core" });
registerCommand("HIDE_SHEET", {
  category: "core",
  allowedOnLockedSheet: true,
});
registerCommand("SHOW_SHEET", {
  category: "core",
  allowedOnLockedSheet: true,
});
registerCommand("LOCK_SHEET", {
  category: "core",
  allowedOnLockedSheet: true,
  inverse: inverseLockSheet,
});
registerCommand("UNLOCK_SHEET", {
  category: "core",
  allowedOnLockedSheet: true,
  inverse: inverseUnlockSheet,
});

// RANGES MANIPULATION
registerCommand("MOVE_RANGES", {
  category: "core",
  invalidatesDependencies: true,
});

// CONDITIONAL FORMAT
registerCommand("ADD_CONDITIONAL_FORMAT", {
  category: "core",
  invalidatesConditionalFormatEvaluation: true,
});
registerCommand("REMOVE_CONDITIONAL_FORMAT", {
  category: "core",
  invalidatesConditionalFormatEvaluation: true,
});
registerCommand("CHANGE_CONDITIONAL_FORMAT_PRIORITY", {
  category: "core",
  invalidatesConditionalFormatEvaluation: true,
});

// FIGURES
registerCommand("CREATE_FIGURE", {
  category: "core",
  inverse: inverseCreateFigure,
});
registerCommand("DELETE_FIGURE", { category: "core" });
registerCommand("UPDATE_FIGURE", { category: "core" });
registerCommand("CREATE_CAROUSEL", { category: "core" });
registerCommand("UPDATE_CAROUSEL", { category: "core" });

// FORMATTING
registerCommand("SET_FORMATTING", { category: "core" });
registerCommand("CLEAR_FORMATTING", { category: "core" });
registerCommand("SET_BORDER", {
  category: "core",
  invalidatesBorders: true,
});
registerCommand("SET_ZONE_BORDERS", {
  category: "core",
  invalidatesBorders: true,
});
registerCommand("SET_BORDERS_ON_TARGET", {
  category: "core",
  invalidatesBorders: true,
});

// CHART
registerCommand("CREATE_CHART", {
  category: "core",
  inverse: inverseCreateChart,
});
registerCommand("UPDATE_CHART", {
  category: "core",
  allowedInReadonly: true,
});
registerCommand("DELETE_CHART", { category: "core" });

// FILTERS
registerCommand("CREATE_TABLE", {
  category: "core",
  invalidatesTableStyle: true,
});
registerCommand("REMOVE_TABLE", {
  category: "core",
  invalidatesTableStyle: true,
});
registerCommand("UPDATE_TABLE", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
});
registerCommand("CREATE_TABLE_STYLE", {
  category: "core",
  invalidatesTableStyle: true,
  inverse: inverseCreateTableStyle,
});
registerCommand("REMOVE_TABLE_STYLE", {
  category: "core",
  invalidatesTableStyle: true,
});

// IMAGE
registerCommand("CREATE_IMAGE", { category: "core" });

// HEADER GROUP
registerCommand("GROUP_HEADERS", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
});
registerCommand("UNGROUP_HEADERS", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
});
registerCommand("UNFOLD_HEADER_GROUP", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
});
registerCommand("FOLD_HEADER_GROUP", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
});
registerCommand("FOLD_ALL_HEADER_GROUPS", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
});
registerCommand("UNFOLD_ALL_HEADER_GROUPS", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
});
registerCommand("UNFOLD_HEADER_GROUPS_IN_ZONE", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
});
registerCommand("FOLD_HEADER_GROUPS_IN_ZONE", {
  category: "core",
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
});

// DATA VALIDATION
registerCommand("ADD_DATA_VALIDATION_RULE", { category: "core" });
registerCommand("REMOVE_DATA_VALIDATION_RULE", { category: "core" });

// MISC
registerCommand("UPDATE_LOCALE", {
  category: "core",
  invalidatesEvaluation: true,
});
registerCommand("CREATE_NAMED_RANGE", {
  category: "core",
  invalidatesEvaluation: true,
});
registerCommand("UPDATE_NAMED_RANGE", {
  category: "core",
  invalidatesEvaluation: true,
});
registerCommand("DELETE_NAMED_RANGE", {
  category: "core",
  invalidatesEvaluation: true,
});

// PIVOT
registerCommand("ADD_PIVOT", {
  category: "core",
  invalidatesEvaluation: true,
  inverse: inverseAddPivot,
});
registerCommand("UPDATE_PIVOT", {
  category: "core",
  invalidatesEvaluation: true,
  allowedInReadonly: true,
});
registerCommand("INSERT_PIVOT", {
  category: "core",
  invalidatesEvaluation: true,
});
registerCommand("RENAME_PIVOT", {
  category: "core",
  invalidatesEvaluation: true,
});
registerCommand("REMOVE_PIVOT", {
  category: "core",
  invalidatesEvaluation: true,
});
registerCommand("DUPLICATE_PIVOT", {
  category: "core",
  invalidatesEvaluation: true,
});

//#region Local Commands
// -----------------------------------------------------------------------------
// Local commands
// -----------------------------------------------------------------------------

// HISTORY
registerCommand("REQUEST_UNDO", {
  category: "local",
  allowedOnLockedSheet: true,
});
registerCommand("REQUEST_REDO", {
  category: "local",
  allowedOnLockedSheet: true,
});
registerCommand("UNDO", {
  category: "local",
  isEvaluationCommand: true,
  invalidatesEvaluation: true,
  invalidatesChartEvaluation: true,
});
registerCommand("REDO", {
  category: "local",
  isEvaluationCommand: true,
  invalidatesEvaluation: true,
  invalidatesChartEvaluation: true,
});

// CLIPBOARD
registerCommand("COPY", {
  category: "local",
  allowedInReadonly: true,
  allowedOnLockedSheet: true,
});
registerCommand("CUT", { category: "local" });
registerCommand("PASTE", { category: "local" });
registerCommand("COPY_PASTE_CELLS_ABOVE", { category: "local" });
registerCommand("COPY_PASTE_CELLS_ON_LEFT", { category: "local" });
registerCommand("COPY_PASTE_CELLS_ON_ZONE", { category: "local" });
registerCommand("REPEAT_PASTE", { category: "local" });
registerCommand("CLEAN_CLIPBOARD_HIGHLIGHT", { category: "local" });
registerCommand("AUTOFILL_CELL", { category: "local" });
registerCommand("PASTE_FROM_OS_CLIPBOARD", { category: "local" });

// GRID SHAPE
registerCommand("AUTORESIZE_COLUMNS", { category: "local" });
registerCommand("AUTORESIZE_ROWS", { category: "local" });
registerCommand("MOVE_COLUMNS_ROWS", { category: "local" });

// SHEETS MANIPULATION
registerCommand("ACTIVATE_SHEET", {
  category: "local",
  allowedInReadonly: true,
  allowedOnLockedSheet: true,
});
registerCommand("ACTIVATE_NEXT_SHEET", {
  category: "local",
  allowedOnLockedSheet: true,
});
registerCommand("ACTIVATE_PREVIOUS_SHEET", {
  category: "local",
  allowedOnLockedSheet: true,
});

// EVALUATION
registerCommand("EVALUATE_CELLS", {
  category: "local",
  isDispatcheableEvaluationCommand: true,
  invalidatesChartEvaluation: true,
  invalidatesConditionalFormatEvaluation: true,
  allowedInReadonly: true,
  allowedOnLockedSheet: true,
});
registerCommand("EVALUATE_CHARTS", {
  category: "local",
  isDispatcheableEvaluationCommand: true,
  invalidatesChartEvaluation: true,
  allowedInReadonly: true,
  allowedOnLockedSheet: true,
});
registerCommand("SET_AUTOMATIC_EVALUATION", {
  category: "local",
  isEvaluationCommand: true,
  allowedInReadonly: true,
});

// COMPOSER
registerCommand("START_CHANGE_HIGHLIGHT", { category: "local" });

// MISC
registerCommand("START", {
  category: "local",
  isEvaluationCommand: true,
  allowedInReadonly: true,
  allowedOnLockedSheet: true,
});
registerCommand("AUTOFILL", { category: "local" });
registerCommand("AUTOFILL_SELECT", { category: "local" });
registerCommand("AUTOFILL_TABLE_COLUMN", { category: "local" });
registerCommand("SET_FORMULA_VISIBILITY", {
  category: "local",
  allowedInReadonly: true,
  allowedOnLockedSheet: true,
});
registerCommand("AUTOFILL_AUTO", { category: "local" });
registerCommand("SELECT_FIGURE", {
  category: "local",
  allowedOnLockedSheet: true,
});
registerCommand("UNSELECT_FIGURE", { category: "local" });
registerCommand("REPLACE_SEARCH", {
  category: "local",
  allowedOnLockedSheet: true,
});
registerCommand("SORT_CELLS", { category: "local" });
registerCommand("SUM_SELECTION", { category: "local" });
registerCommand("DELETE_CELL", { category: "local" });
registerCommand("INSERT_CELL", { category: "local" });
registerCommand("SPLIT_TEXT_INTO_COLUMNS", { category: "local" });
registerCommand("REMOVE_DUPLICATES", { category: "local" });
registerCommand("TRIM_WHITESPACE", { category: "local" });
registerCommand("TOGGLE_CHECKBOX", { category: "local" });
registerCommand("DELETE_DATA_SOURCES", { category: "local" });
registerCommand("UPDATE_COLOR_SCHEME", {
  category: "local",
  allowedInReadonly: true,
});

// FORMATTING
registerCommand("SET_DECIMAL", { category: "local" });
registerCommand("SET_FORMATTING_WITH_PIVOT", { category: "local" });
registerCommand("PAINT_FORMAT", { category: "local" });
registerCommand("SET_BACKGROUND_FOR_ALL_CELLS", { category: "local" });

// FILTERS / TABLES
registerCommand("UPDATE_FILTER", {
  category: "local",
  isEvaluationCommand: true,
  invalidatesChartEvaluation: true,
  invalidatesTableStyle: true,
  invalidatesSubtotalFormulas: true,
  allowedInReadonly: true,
  allowedOnLockedSheet: true,
});
registerCommand("RESIZE_TABLE", { category: "local" });
registerCommand("DELETE_UNFILTERED_CONTENT", { category: "local" });

// PIVOT
registerCommand("REFRESH_PIVOT", {
  category: "local",
  isEvaluationCommand: true,
});
registerCommand("INSERT_NEW_PIVOT", { category: "local" });
registerCommand("DUPLICATE_PIVOT_IN_NEW_SHEET", {
  category: "local",
  allowedOnLockedSheet: true,
});
registerCommand("INSERT_PIVOT_WITH_TABLE", { category: "local" });
registerCommand("SPLIT_PIVOT_FORMULA", { category: "local" });
registerCommand("PIVOT_START_PRESENCE_TRACKING", {
  category: "local",
  isEvaluationCommand: true,
});
registerCommand("PIVOT_STOP_PRESENCE_TRACKING", {
  category: "local",
  isEvaluationCommand: true,
});

// FIGURES
registerCommand("UPDATE_FIGURES", { category: "local" });
registerCommand("DELETE_FIGURES", { category: "local" });

// CHART / CAROUSEL
registerCommand("ADD_NEW_CHART_TO_CAROUSEL", { category: "local" });
registerCommand("ADD_FIGURES_CHART_TO_CAROUSEL", { category: "local" });
registerCommand("DUPLICATE_CAROUSEL_CHART", { category: "local" });
registerCommand("UPDATE_CAROUSEL_ACTIVE_ITEM", {
  category: "local",
  allowedInReadonly: true,
  allowedOnLockedSheet: true,
});
registerCommand("POPOUT_CHART_FROM_CAROUSEL", { category: "local" });
registerCommand("UPDATE_CHART_REGION", {
  category: "local",
  allowedInReadonly: true,
});
registerCommand("MERGE_CHART_FIGURES_INTO_CAROUSEL", { category: "local" });
registerCommand("CREATE_CHART_AND_MERGE_INTO_CAROUSEL", { category: "local" });
