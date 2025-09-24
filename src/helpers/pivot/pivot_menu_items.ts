import {
  CellPosition,
  CellValue,
  Getters,
  PivotCoreDefinition,
  PivotCustomGroup,
  PivotCustomGroupedField,
  PivotDomain,
  PivotField,
  PivotFields,
  PivotHeaderCell,
  SortDirection,
  SpreadsheetChildEnv,
  UID,
} from "../..";
import { ActionSpec } from "../../actions/action";
import { _t } from "../../translation";
import { CellValueType } from "../../types";
import { deepCopy, deepEquals } from "../misc";
import { cellPositions } from "../zones";
import { domainToColRowDomain } from "./pivot_domain_helpers";
import {
  addDimensionToPivotDefinition,
  getCustomFieldWithParentField,
  getUniquePivotGroupName,
  removePivotGroupsContainingValues,
  togglePivotCollapse,
} from "./pivot_helpers";
import { pivotRegistry } from "./pivot_registry";

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
    return (!env.isSmall && pivotId && env.model.getters.isExistingPivot(pivotId)) || false;
  },
  isReadonlyAllowed: true,
  icon: "o-spreadsheet-Icon.PIVOT",
};

export const pivotSortingAsc: ActionSpec = {
  name: _t("Ascending"),
  execute: (env) => sortPivot(env, env.model.getters.getActivePosition(), "asc"),
  isActive: (env) =>
    env.model.getters.getPivotCellSortDirection(env.model.getters.getActivePosition()) === "asc",
};

export const pivotSortingDesc: ActionSpec = {
  name: _t("Descending"),
  execute: (env) => sortPivot(env, env.model.getters.getActivePosition(), "desc"),
  isActive: (env) =>
    env.model.getters.getPivotCellSortDirection(env.model.getters.getActivePosition()) === "desc",
};

export const noPivotSorting: ActionSpec = {
  name: _t("No sorting"),
  execute: (env) => sortPivot(env, env.model.getters.getActivePosition(), "none"),
  isActive: (env) =>
    env.model.getters.getPivotCellSortDirection(env.model.getters.getActivePosition()) === "none",
};

export const FIX_FORMULAS: ActionSpec = {
  name: _t("Convert to individual formulas"),
  execute(env) {
    const position = env.model.getters.getActivePosition();
    const cell = env.model.getters.getCorrespondingFormulaCell(position);
    const pivotId = env.model.getters.getPivotIdFromPosition(position);
    if (!cell || !pivotId) {
      return;
    }
    const { sheetId, col, row } = env.model.getters.getCellPosition(cell.id);
    const pivot = env.model.getters.getPivot(pivotId);
    pivot.init();
    if (!pivot.isValid()) {
      return;
    }
    env.model.dispatch("SPLIT_PIVOT_FORMULA", {
      sheetId,
      col,
      row,
      pivotId,
    });
  },
  isVisible: (env) => {
    const position = env.model.getters.getActivePosition();
    const pivotId = env.model.getters.getPivotIdFromPosition(position);
    if (!pivotId) {
      return false;
    }
    const pivot = env.model.getters.getPivot(pivotId);
    const cell = env.model.getters.getEvaluatedCell(position);
    return (
      pivot.isValid() &&
      env.model.getters.isSpillPivotFormula(position) &&
      cell.type !== CellValueType.error
    );
  },
  icon: "o-spreadsheet-Icon.PIVOT",
};

export const groupPivotHeaders: ActionSpec = {
  name: _t("Group pivot dimensions"),
  execute: (env) => {
    const matchingHeaders = getMatchingPivotHeadersInSelection(env);
    if (!matchingHeaders) {
      return;
    }
    const { pivotId, values, field } = matchingHeaders;
    const pivot = env.model.getters.getPivot(pivotId);
    const definition = deepCopy(env.model.getters.getPivotCoreDefinition(pivotId));

    if (!field.isCustomField) {
      groupValuesInNormalField(definition, values, field, pivot.getFields());
    } else {
      const customField = (definition.customFields || {})[field.name];
      if (!customField) {
        return;
      }
      groupValuesInCustomField(customField, values);
    }

    env.model.dispatch("UPDATE_PIVOT", { pivotId, pivot: definition });
  },
  isVisible: (env) => {
    const matchingHeaders = getMatchingPivotHeadersInSelection(env);
    if (!matchingHeaders) {
      return false;
    }
    const { pivotId, values, field } = matchingHeaders;
    const pivot = env.model.getters.getPivot(pivotId);
    return (
      values.length > 1 &&
      (field.isCustomField || pivotRegistry.get(pivot.type).canHaveCustomGroup(field))
    );
  },
};

export const groupRemainingPivotHeadersAction: ActionSpec = {
  name: _t("Group all remaining dimensions"),
  execute: (env) => {
    const matchingHeaders = getMatchingPivotHeadersInSelection(env);
    if (!matchingHeaders) {
      return;
    }
    const { pivotId, field } = matchingHeaders;
    const pivot = env.model.getters.getPivot(pivotId);
    const definition = deepCopy(env.model.getters.getPivotCoreDefinition(pivotId));

    const customField = field.isCustomField
      ? (definition.customFields || {})[field.name]
      : getCustomFieldWithParentField(definition, field, pivot.getFields());
    if (!customField) {
      return;
    }
    customField.groups.push({
      name: getUniquePivotGroupName(_t("Others"), customField),
      values: [],
      isOtherGroup: true,
    });
    addDimensionToPivotDefinition(definition, field.name, customField.name);
    env.model.dispatch("UPDATE_PIVOT", { pivotId, pivot: definition });
  },
  isVisible: (env) => {
    const matchingHeaders = getMatchingPivotHeadersInSelection(env);
    if (!matchingHeaders) {
      return false;
    }
    const { pivotId, field, values } = matchingHeaders;
    return valuesAreAllNonGroupedValues(env, pivotId, values, field);
  },
};

export const ungroupPivotHeadersAction: ActionSpec = {
  name: _t("Ungroup pivot dimensions"),
  execute: (env) => {
    const matchingHeaders = getMatchingPivotHeadersInSelection(env);
    if (!matchingHeaders) {
      return;
    }
    const { pivotId, values, field } = matchingHeaders;
    const pivot = env.model.getters.getPivot(pivotId);
    const definition = deepCopy(env.model.getters.getPivotCoreDefinition(pivotId));
    ungroupPivotHeaders(definition, values, field, pivot.getFields());

    env.model.dispatch("UPDATE_PIVOT", { pivotId, pivot: definition });
  },
  isVisible: (env) => {
    const matchingHeaders = getMatchingPivotHeadersInSelection(env);
    if (!matchingHeaders) {
      return false;
    }
    const { pivotId, values, field } = matchingHeaders;
    const pivot = env.model.getters.getPivot(pivotId);
    const definition = env.model.getters.getPivotCoreDefinition(pivotId);

    if (!field.isCustomField) {
      // Check if the parent custom grouped field is in the pivot
      const customField = getCustomFieldWithParentField(definition, field, pivot.getFields());
      const dimensions = [...definition.rows, ...definition.columns];
      if (!dimensions.some((d) => d.fieldName === customField.name)) {
        return false;
      }
    }

    return areFieldValuesInGroups(definition, values, field, pivot.getFields());
  },
};

export const collapsePivotGroupAction: ActionSpec = {
  name: (env) => {
    const position = env.model.getters.getActivePosition();
    const pivotCellState = getPivotCellCollapseState(env.model.getters, position);
    if (pivotCellState.isPivotGroup) {
      return pivotCellState.isCollapsed ? _t("Expand") : _t("Collapse");
    }
    return "";
  },
  execute(env) {
    const position = env.model.getters.getActivePosition();
    togglePivotCollapse(position, env);
  },
  isVisible: (env) => {
    const position = env.model.getters.getActivePosition();
    const pivotCellState = getPivotCellCollapseState(env.model.getters, position);
    return pivotCellState.isPivotGroup;
  },
};

export const collapseAllPivotGroupAction: ActionSpec = {
  name: _t("Collapse all"),
  execute(env) {
    const position = env.model.getters.getActivePosition();
    const pivotCellState = getPivotCellCollapseState(env.model.getters, position);
    if (!pivotCellState.isPivotGroup) {
      return;
    }
    const { pivotCell, pivotId, siblingDomains } = pivotCellState;

    const definition = deepCopy(env.model.getters.getPivotCoreDefinition(pivotId));
    definition.collapsedDomains = definition.collapsedDomains || { COL: [], ROW: [] };
    const newCollapsed = [
      ...(definition.collapsedDomains[pivotCell.dimension] || []),
      ...siblingDomains,
    ];

    const filteredCollapsed = newCollapsed.filter(
      (domain, index) => index === newCollapsed.findIndex((d) => deepEquals(d, domain))
    );

    definition.collapsedDomains[pivotCell.dimension] = filteredCollapsed;
    env.model.dispatch("UPDATE_PIVOT", { pivotId, pivot: definition });
  },
  isVisible: (env) => {
    const position = env.model.getters.getActivePosition();
    const pivotCellState = getPivotCellCollapseState(env.model.getters, position);
    if (!pivotCellState.isPivotGroup) {
      return false;
    }

    const { pivotCell, pivotId, siblingDomains } = pivotCellState;
    const definition = env.model.getters.getPivotCoreDefinition(pivotId);

    return !siblingDomains.every((domain) =>
      (definition.collapsedDomains?.[pivotCell.dimension] || []).some((d) => deepEquals(d, domain))
    );
  },
};

export const expandAllPivotGroupAction: ActionSpec = {
  name: _t("Expand all"),
  execute(env) {
    const position = env.model.getters.getActivePosition();
    const pivotCellState = getPivotCellCollapseState(env.model.getters, position);
    if (!pivotCellState.isPivotGroup) {
      return;
    }
    const { pivotCell, pivotId, siblingDomains } = pivotCellState;

    const definition = deepCopy(env.model.getters.getPivotCoreDefinition(pivotId));
    definition.collapsedDomains = definition.collapsedDomains || { COL: [], ROW: [] };

    const domains = definition.collapsedDomains[pivotCell.dimension] || [];
    const filteredDomains = domains.filter(
      (domain) => !siblingDomains.find((d) => deepEquals(d, domain))
    );

    definition.collapsedDomains[pivotCell.dimension] = filteredDomains;
    env.model.dispatch("UPDATE_PIVOT", { pivotId, pivot: definition });
  },
  isVisible: (env) => {
    const position = env.model.getters.getActivePosition();
    const pivotCellState = getPivotCellCollapseState(env.model.getters, position);
    if (!pivotCellState.isPivotGroup) {
      return false;
    }

    const { pivotCell, pivotId, siblingDomains } = pivotCellState;
    const definition = env.model.getters.getPivotCoreDefinition(pivotId);
    const collapsedDomains = definition.collapsedDomains?.[pivotCell.dimension] || [];
    return collapsedDomains.some((domain) => siblingDomains.some((d) => deepEquals(d, domain)));
  },
};

function getPivotCellCollapseState(
  getters: Getters,
  position: CellPosition
):
  | { isPivotGroup: false }
  | {
      isPivotGroup: true;
      isCollapsed: boolean;
      pivotCell: PivotHeaderCell;
      pivotId: UID;
      siblingDomains: PivotDomain[];
    } {
  if (!getters.isSpillPivotFormula(position)) {
    return { isPivotGroup: false };
  }
  const pivotCell = getters.getPivotCellFromPosition(position);
  const pivotId = getters.getPivotIdFromPosition(position);

  if (pivotCell.type !== "HEADER" || !pivotId || !pivotCell.domain.length) {
    return { isPivotGroup: false };
  }
  const definition = getters.getPivotCoreDefinition(pivotId);
  const isDashboard = getters.isDashboard();

  const fields = pivotCell.dimension === "COL" ? definition.columns : definition.rows;
  const hasIcon = !isDashboard && pivotCell.domain.length !== fields.length;
  if (!hasIcon) {
    return { isPivotGroup: false };
  }

  const domains = definition.collapsedDomains?.[pivotCell.dimension] ?? [];
  const isCollapsed = domains.some((domain) => deepEquals(domain, pivotCell.domain));

  const pivot = getters.getPivot(pivotId);
  const table = pivot.getExpandedTableStructure();
  const depth = pivotCell.domain.length - 1;
  const siblingDomains =
    pivotCell.dimension === "ROW"
      ? table.getRowDomainsAtDepth(depth)
      : table.getColumnDomainsAtDepth(depth);

  return { isPivotGroup: true, isCollapsed, pivotCell, pivotId, siblingDomains };
}

export function canSortPivot(getters: Getters, position: CellPosition): boolean {
  const pivotId = getters.getPivotIdFromPosition(position);
  if (!pivotId || !getters.isExistingPivot(pivotId) || !getters.isSpillPivotFormula(position)) {
    return false;
  }
  const pivot = getters.getPivot(pivotId);
  if (!pivot.isValid()) {
    return false;
  }
  const pivotCell = getters.getPivotCellFromPosition(position);
  return pivotCell.type === "VALUE" || pivotCell.type === "MEASURE_HEADER";
}

export function sortPivot(
  env: SpreadsheetChildEnv,
  position: CellPosition,
  order: SortDirection | "none"
) {
  const pivotId = env.model.getters.getPivotIdFromPosition(position);
  const pivotCell = env.model.getters.getPivotCellFromPosition(position);
  if (pivotCell.type === "EMPTY" || pivotCell.type === "HEADER" || !pivotId) {
    return;
  }

  if (order === "none") {
    env.model.dispatch("UPDATE_PIVOT", {
      pivotId: pivotId,
      pivot: {
        ...env.model.getters.getPivotCoreDefinition(pivotId),
        sortedColumn: undefined,
      },
    });
    return;
  }

  const pivot = env.model.getters.getPivot(pivotId);
  const colDomain = domainToColRowDomain(pivot, pivotCell.domain).colDomain;
  env.model.dispatch("UPDATE_PIVOT", {
    pivotId: pivotId,
    pivot: {
      ...env.model.getters.getPivotCoreDefinition(pivotId),
      sortedColumn: { domain: colDomain, order, measure: pivotCell.measure },
    },
  });
}

/*
 * Get the values of the pivot headers in the current selection, if all the pivot headers on the selection belong
 * to the same pivot, the same field and that the pivot formula is a dynamic pivot. Otherwise return undefined.
 */
function getMatchingPivotHeadersInSelection(env: SpreadsheetChildEnv) {
  let pivotId: string | undefined;
  let fieldName: string | undefined;
  const pivotHeaders: PivotHeaderCell[] = [];
  for (const zone of env.model.getters.getSelectedZones()) {
    const sheetId = env.model.getters.getActiveSheetId();
    for (const position of cellPositions(sheetId, zone)) {
      const cellPivotId = env.model.getters.getPivotIdFromPosition(position);
      if (!pivotId) {
        pivotId = cellPivotId;
      } else if (cellPivotId && pivotId !== cellPivotId) {
        return undefined;
      }
      if (!pivotId) {
        continue;
      }
      const pivotCell = env.model.getters.getPivotCellFromPosition(position);
      if (pivotCell.type !== "HEADER" || !env.model.getters.isSpillPivotFormula(position)) {
        continue;
      }
      const cellLeafField = pivotCell.domain.at(-1)?.field;
      if (!fieldName && cellLeafField) {
        fieldName = cellLeafField;
      } else if (fieldName && cellLeafField && fieldName !== cellLeafField) {
        return undefined;
      }
      pivotHeaders.push(pivotCell);
    }
  }
  if (!pivotId || !fieldName || pivotHeaders.length === 0) {
    return undefined;
  }

  const field = env.model.getters.getPivot(pivotId).getFields()[fieldName];
  if (!field) {
    return undefined;
  }
  const values = pivotHeaders
    .map((pivotCell) => pivotCell.domain.at(-1)?.value)
    .filter((val) => val !== undefined);

  return { pivotId, values, field };
}

/**
 *  Remove existing groups containing the selected values, and create a new group
 */
function groupValuesInNormalField(
  definition: PivotCoreDefinition,
  selectedValues: CellValue[],
  field: PivotField,
  fields: PivotFields
) {
  const customField = getCustomFieldWithParentField(definition, field, fields);

  removePivotGroupsContainingValues(selectedValues, customField);
  const newGroup: PivotCustomGroup = {
    name: getUniquePivotGroupName(_t("Group"), customField),
    values: selectedValues,
  };
  customField.groups.push(newGroup);

  if (!definition.customFields) {
    definition.customFields = {};
  }
  definition.customFields[customField.name] = customField;
  addDimensionToPivotDefinition(definition, field.name, customField.name);
}

/**
 * We either merge the selected values into a single existing group, or create a new group
 */
function groupValuesInCustomField(customField: PivotCustomGroupedField, fieldValues: CellValue[]) {
  const valuesToGroup: Set<CellValue> = new Set();
  const groupsInSelection: PivotCustomGroup[] = [];
  for (const value of fieldValues) {
    const group = customField.groups.find((g) => g.name === value);
    if (group) {
      groupsInSelection.push(group);
      group.values.forEach((v) => valuesToGroup.add(v));
    } else {
      valuesToGroup.add(value);
    }
  }

  if (groupsInSelection.some((g) => g.isOtherGroup)) {
    customField.groups = customField.groups.filter(
      (g) => g.isOtherGroup || !groupsInSelection.includes(g)
    );
  } else if (groupsInSelection.length === 0) {
    const newGroup: PivotCustomGroup = {
      name: getUniquePivotGroupName(_t("Group"), customField),
      values: fieldValues,
    };
    customField.groups.push(newGroup);
  } else {
    const groupsToRemove = groupsInSelection.slice(1);
    customField.groups = customField.groups.filter((g) => !groupsToRemove.includes(g));
    groupsInSelection[0].values = Array.from(valuesToGroup);
  }
}

function ungroupPivotHeaders(
  definition: PivotCoreDefinition,
  fieldValues: CellValue[],
  field: PivotField,
  fields: PivotFields
) {
  let customField: PivotCustomGroupedField | undefined;
  // Non-custom field: remove existing groups containing the selected values
  if (!field.isCustomField) {
    customField = getCustomFieldWithParentField(definition, field, fields);

    // Check if some values are in the  "Others" group
    if (
      customField.groups.some((g) => g.isOtherGroup) &&
      fieldValues.some((v) => !customField?.groups.some((g) => g.values.includes(v)))
    ) {
      customField.groups = customField.groups.filter((g) => !g.isOtherGroup);
    }
    removePivotGroupsContainingValues(fieldValues, customField);
  }
  // Custom field: remove the selected groups
  else {
    customField = (definition.customFields || {})[field.name];
    if (!customField) {
      return;
    }
    customField.groups = customField.groups.filter((g) => !fieldValues.includes(g.name));
  }

  if (customField.groups.every((g) => g.values.length === 0 && !g.isOtherGroup)) {
    removeCustomFieldFromDimensions(definition, customField.name);
    delete definition.customFields?.[customField.name];
  }
}

/**
 * Checks if the given field values are in any of the groups of the given field.
 */
function areFieldValuesInGroups(
  definition: PivotCoreDefinition,
  fieldValues: CellValue[],
  field: PivotField,
  fields: PivotFields
): boolean {
  // If the field is not a custom field, check if there are any custom groups containing the selected values
  if (!field.isCustomField) {
    const customField = getCustomFieldWithParentField(definition, field, fields);
    return customField.groups.some(
      (group) => group.isOtherGroup || fieldValues.some((value) => group.values.includes(value))
    );
  }
  // If the field is a custom field, check if there are any groups named after the selected values
  else {
    const customField = (definition.customFields || {})[field.name];
    if (!customField) {
      return false;
    }
    return customField.groups.some((group) => fieldValues.includes(group.name));
  }
}

/** Checks that the values given are equal to all the values that are not grouped in the pivot dimension. */
function valuesAreAllNonGroupedValues(
  env: SpreadsheetChildEnv,
  pivotId: string,
  values: CellValue[],
  field: PivotField
): boolean {
  const pivot = env.model.getters.getPivot(pivotId);
  const definition = env.model.getters.getPivotCoreDefinition(pivotId);
  const customField = field.isCustomField
    ? (definition.customFields || {})[field.name]
    : Object.values(definition.customFields || {}).find((f) => f.parentField === field.name);

  const dimension = pivot.definition.getDimension(field.name);
  if (
    !dimension ||
    !customField ||
    areFieldValuesInGroups(definition, values, field, pivot.getFields())
  ) {
    return false;
  }

  const possibleValues: Set<CellValue> = new Set(
    pivot.getPossibleFieldValues(dimension).map((v) => v.value)
  );

  const groupValues = field.isCustomField
    ? customField.groups.map((g) => g.name)
    : customField.groups.flatMap((g) => g.values);

  for (const val of [...values, ...groupValues]) {
    possibleValues.delete(val);
  }

  return possibleValues.size === 0;
}

/**
 * Remove the given custom field from the rows/columns of the pivot, and replace it by the field it's based on (if the
 * field isn't already in the pivot). Modifies the definition in place.
 */
function removeCustomFieldFromDimensions(definition: PivotCoreDefinition, customFieldName: string) {
  const customField = definition.customFields?.[customFieldName];
  if (!customField) {
    return;
  }

  const isParentFieldInDimensions = [...definition.rows, ...definition.columns].some(
    (d) => d.fieldName === customField.parentField
  );

  for (const dim of [definition.rows, definition.columns]) {
    const indexInDimension = dim.findIndex((d) => d.fieldName === customFieldName);
    if (indexInDimension !== -1) {
      if (!isParentFieldInDimensions) {
        dim.splice(indexInDimension, 1, { fieldName: customField.parentField });
      } else {
        dim.splice(indexInDimension, 1);
      }
    }
  }
}
