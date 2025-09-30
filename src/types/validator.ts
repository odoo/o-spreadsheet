import type {
  Validation as EngineValidation,
  Validator as EngineValidator,
} from "@odoo/o-spreadsheet-engine/types/validator";
import type { CommandResult } from "./commands";

export type Validation<T> = EngineValidation<T, CommandResult>;
export type Validator = EngineValidator<CommandResult>;
