import type { CommandResult } from "@odoo/o-spreadsheet-engine/types/commands";
import type {
  Validation as EngineValidation,
  Validator as EngineValidator,
} from "@odoo/o-spreadsheet-engine/types/validator";

export type Validation<T> = EngineValidation<T, CommandResult>;
export type Validator = EngineValidator<CommandResult>;
