import { Arg } from "../types";
import { conditionalVisitBoolean } from "./helpers";

export function boolAnd(args: Arg[]) {
  let foundBoolean = false;
  let acc = true;
  conditionalVisitBoolean(args, (arg) => {
    foundBoolean = true;
    acc = acc && arg;
    return acc;
  });
  return {
    foundBoolean,
    result: acc,
  };
}

export function boolOr(args: Arg[]) {
  let foundBoolean = false;
  let acc = false;
  conditionalVisitBoolean(args, (arg) => {
    foundBoolean = true;
    acc = acc || arg;
    return !acc;
  });
  return {
    foundBoolean,
    result: acc,
  };
}
