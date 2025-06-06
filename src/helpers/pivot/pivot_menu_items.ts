import {
  CellValue,
  PivotCoreDefinition,
  PivotCustomGroup,
  PivotCustomGroupedField,
  PivotField,
  PivotFields,
  PivotHeaderCell,
  SortDirection,
  SpreadsheetChildEnv,
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
} from "./pivot_helpers";

// ADRM TODO: check field is groupable before showing menu items
// ADRM TODO: how do I handle non-supported aggregators is odoo ?

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
  execute: (env) => sortPivot(env, "asc"),
  isActive: (env) => isPivotSortMenuItemActive(env, "asc"),
};

export const pivotSortingDesc: ActionSpec = {
  name: _t("Descending"),
  execute: (env) => sortPivot(env, "desc"),
  isActive: (env) => isPivotSortMenuItemActive(env, "desc"),
};

export const noPivotSorting: ActionSpec = {
  name: _t("No sorting"),
  execute: (env) => sortPivot(env, "none"),
  isActive: (env) => isPivotSortMenuItemActive(env, "none"),
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
    const { pivotId, values, field, valueToLabelMap } = matchingHeaders;
    const pivot = env.model.getters.getPivot(pivotId);
    const definition = deepCopy(env.model.getters.getPivotCoreDefinition(pivotId));

    if (!field.isCustomField) {
      groupValuesInNormalField(definition, values, field, pivot.getFields(), valueToLabelMap);
    } else {
      const customField = (definition.customFields || {})[field.name];
      if (!customField) {
        return;
      }
      groupValuesInCustomField(customField, values, valueToLabelMap);
    }

    env.model.dispatch("UPDATE_PIVOT", { pivotId, pivot: definition });
  },
  isVisible: (env) => {
    const matchingHeaders = getMatchingPivotHeadersInSelection(env);
    return !!(matchingHeaders && matchingHeaders.values.length > 1);
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
    return valesAreAllNonGroupedValues(env, pivotId, values, field);
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
    return areFieldValuesInGroups(definition, values, field, pivot.getFields());
  },
};

export const editCustomFieldAction: ActionSpec = {
  name: _t("Edit pivot groups"),
  execute: (env) => {
    const matchingHeaders = getMatchingPivotHeadersInSelection(env);
    if (!matchingHeaders) {
      return;
    }
    const { pivotId, field } = matchingHeaders;
    const definition = env.model.getters.getPivotCoreDefinition(pivotId);
    env.openSidePanel("PivotCustomFieldSidePanel", {
      pivotId,
      customField: definition.customFields?.[field.name],
    });
  },
  isVisible: (env) => !!getMatchingPivotHeadersInSelection(env)?.field?.isCustomField || false,
};

export function canSortPivot(env: SpreadsheetChildEnv): boolean {
  const position = env.model.getters.getActivePosition();
  const pivotId = env.model.getters.getPivotIdFromPosition(position);
  if (
    !pivotId ||
    !env.model.getters.isExistingPivot(pivotId) ||
    !env.model.getters.isSpillPivotFormula(position)
  ) {
    return false;
  }
  const pivot = env.model.getters.getPivot(pivotId);
  if (!pivot.isValid()) {
    return false;
  }
  const pivotCell = env.model.getters.getPivotCellFromPosition(position);
  return pivotCell.type === "VALUE" || pivotCell.type === "MEASURE_HEADER";
}

function sortPivot(env: SpreadsheetChildEnv, order: SortDirection | "none") {
  const position = env.model.getters.getActivePosition();
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

function isPivotSortMenuItemActive(
  env: SpreadsheetChildEnv,
  order: SortDirection | "none"
): boolean {
  const position = env.model.getters.getActivePosition();
  const pivotId = env.model.getters.getPivotIdFromPosition(position);
  const pivotCell = env.model.getters.getPivotCellFromPosition(position);
  if (pivotCell.type === "EMPTY" || pivotCell.type === "HEADER" || !pivotId) {
    return false;
  }
  const pivot = env.model.getters.getPivot(pivotId);
  const colDomain = domainToColRowDomain(pivot, pivotCell.domain).colDomain;
  const sortedColumn = pivot.definition.sortedColumn;

  if (order === "none") {
    return !sortedColumn;
  }

  if (!sortedColumn || sortedColumn.order !== order) {
    return false;
  }
  return sortedColumn.measure === pivotCell.measure && deepEquals(sortedColumn.domain, colDomain);
}

/*
 * Get the values of the pivot headers in the current selection, if all the pivot headers on the selection belong
 * to the same pivot and the same pivot field. Otherwise return undefined.
 */
function getMatchingPivotHeadersInSelection(env: SpreadsheetChildEnv) {
  let pivotId: string | undefined;
  let fieldName: string | undefined;
  const pivotHeaders: (PivotHeaderCell & { label: string })[] = [];
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
      if (pivotCell.type !== "HEADER") {
        return undefined;
      }
      const cellLeafField = pivotCell.domain.at(-1)?.field;
      if (!fieldName && cellLeafField) {
        fieldName = cellLeafField;
      } else if (fieldName && cellLeafField && fieldName !== cellLeafField) {
        return undefined;
      }
      const label = env.model.getters.getEvaluatedCell(position).formattedValue;
      pivotHeaders.push({ ...pivotCell, label });
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
    .filter((val) => val !== undefined && val !== null);

  const valueToLabelMap = new Map<CellValue, string>();
  for (const pivotCell of pivotHeaders) {
    const value = pivotCell.domain.at(-1)?.value;
    if (value !== undefined && value !== null) {
      valueToLabelMap.set(value, pivotCell.label);
    }
  }

  return { pivotId, values, field, valueToLabelMap };
}

/**
 *  Remove existing groups containing the selected values, and create a new group
 */
function groupValuesInNormalField(
  definition: PivotCoreDefinition,
  selectedValues: CellValue[],
  field: PivotField,
  fields: PivotFields,
  valueToLabelMap: Map<CellValue, string>
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
function groupValuesInCustomField(
  customField: PivotCustomGroupedField,
  fieldValues: CellValue[],
  valueToLabelMap: Map<CellValue, string>
) {
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
      name: getUniquePivotGroupName(
        fieldValues.map((v) => valueToLabelMap.get(v)).join(","),
        customField
      ),
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
    delete definition.customFields?.[customField.name];
  }
}

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
  // If the field is a custom field, check if there are any groups with the selected values
  else {
    const customField = (definition.customFields || {})[field.name];
    if (!customField) {
      return false;
    }
    return customField.groups.some((group) => fieldValues.includes(group.name));
  }
}

/** Checks that the values given are equal to all the values that are not grouped in the pivot dimension. */
function valesAreAllNonGroupedValues(
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

  // Add the grouped values to values, then compare them to all the possible values
  if (field.isCustomField) {
    values.push(...customField.groups.map((g) => g.name));
  } else {
    values.push(...customField.groups.flatMap((g) => g.values));
  }

  const possibleValues: Set<CellValue> = new Set(
    pivot.getPossibleDimensionValues(dimension).map((v) => v.value)
  );
  for (const value of values) {
    possibleValues.delete(value);
  }

  return possibleValues.size === 0;
}
