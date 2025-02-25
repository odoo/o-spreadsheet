import { ConditionalFormattingOperatorValues, GenericCriterionType } from "../types";

const conversionMap: Record<ConditionalFormattingOperatorValues, GenericCriterionType | undefined> =
  {
    BeginsWith: "textBeginsWith",
    Between: "isBetween",
    ContainsText: "textContains",
    IsEmpty: "isEmpty",
    IsNotEmpty: "isNotEmpty",
    EndsWith: "textEndsWith",
    Equal: "typedIsEqual",
    GreaterThan: "isGreaterThan",
    GreaterThanOrEqual: "isGreaterOrEqualTo",
    LessThan: "isLessThan",
    LessThanOrEqual: "isLessOrEqualTo",
    NotBetween: "isNotBetween",
    NotContains: "textNotContains",
    NotEqual: "typedIsNotEqual",
  };

export function cfOperatorToCriterionType(
  operator: ConditionalFormattingOperatorValues
): GenericCriterionType {
  const criterionType = conversionMap[operator];
  if (criterionType === undefined) {
    throw new Error(`Invalid operator: ${operator}`);
  }
  return criterionType;
}

export function criterionTypeToCfOperator(
  criterionType: GenericCriterionType
): ConditionalFormattingOperatorValues {
  for (const [operator, type] of Object.entries(conversionMap)) {
    // ADRM TODO entries
    if (type === criterionType) {
      return operator as ConditionalFormattingOperatorValues;
    }
  }
  throw new Error(`Invalid criterion type: ${criterionType}`);
}
