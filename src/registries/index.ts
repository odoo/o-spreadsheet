import { AutofillRule } from "../types";
import { OTRegistry } from "./ot_registry";
import { Registry } from "./registry";

export * from "./autofill_modifiers";
export * from "./cell_popovers_registry";
export * from "./chart_types";
export * from "./currencies_registry";
export * from "./figure_registry";
export * from "./inverse_command_registry";
export * from "./menus/index";
export * from "./side_panel_registry";
export * from "./topbar_component_registry";

interface IOtRegistry {
  name: "ot_registry";
  registry: OTRegistry;
}

interface IAutofillRuleRegistry {
  name: "autofill_rule";
  registry: Registry<AutofillRule>;
}

type Registries = IOtRegistry | IAutofillRuleRegistry;
type RegistryNames = Registries["name"];

interface RegistryGetter {
  registry<T extends RegistryNames, R extends Extract<Registries, { name: T }>>(
    name: T
  ): R["registry"];
  register<T extends RegistryNames, R extends Extract<Registries, { name: T }>>(
    name: T,
    registry: R["registry"]
  ): void;
}

const registries = new Registry<Registries["registry"]>();

export const registry: RegistryGetter["registry"] = (name) => {
  return registries.get(name);
};

const addRegistry: RegistryGetter["register"] = (name, registry) => {
  registries.add(name, registry);
};

addRegistry("ot_registry", new OTRegistry());
addRegistry("autofill_rule", new Registry<AutofillRule>());
