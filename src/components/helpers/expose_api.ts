import { hooks } from "@odoo/owl";
const { useComponent } = hooks;

export function exposeAPI<T>(api: T) {
  const component = useComponent();
  const props = component.props as any;
  if (props.exposeAPI) {
    props.exposeAPI(api);
  }
}
