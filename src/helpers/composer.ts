import { EnrichedToken } from "../formulas/composer_tokenizer";
import { functionRegistry } from "../functions";

export function isFunctionRegistryToken(token: EnrichedToken) {
  if (token.type !== "SYMBOL") {
    return false;
  }
  if (token.value.toUpperCase() in functionRegistry.content) {
    return true;
  }
  return false;
}

export function isBooleanToken(token: EnrichedToken) {
  if (token.type !== "SYMBOL") {
    return false;
  }
  if (["TRUE", "FALSE"].includes(token.value.toUpperCase())) {
    return true;
  }
  return false;
}
