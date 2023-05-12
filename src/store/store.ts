import { reactive } from "@odoo/owl";
import { Get } from "./dependency_container";

export class Store {
  constructor(protected get: Get) {
    return reactive(this);
  }
}
