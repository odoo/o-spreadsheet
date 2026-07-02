import { App, blockDom } from "@odoo/owl";
import { _t } from "../../../../translation";

/**
 * Custom tooltip for the charts. Mostly copied from Odoo's custom tooltip, with some slight changes to make it work
 * with o-spreadsheet chart data and CSS.
 *
 * https://github.com/odoo/odoo/blob/18.0/addons/web/static/src/views/graph/graph_renderer.xml
 */
const templates = /* xml */ `
<templates>
  <t t-name="o-spreadsheet-CustomTooltip">
    <div
      class="o-chart-custom-tooltip border rounded px-2 py-1 pe-none mw-100 position-absolute text-nowrap shadow opacity-100">
      <div
        t-if="title"
        class="o-tooltip-title text-truncate mb-1 fw-bold"
        t-out="title"
        t-attf-style="max-width: {{ labelsMaxWidth }}"
      />
      <table class="overflow-hidden m-0" style="table-layout: auto; width: auto">
        <tbody>
          <tr t-foreach="tooltipItems" t-as="tooltipItem" t-key="tooltipItem_index">
            <td
              class="o-tooltip-color-indicator ps-2 align-top"
              t-attf-style="border-left: 5px solid {{ tooltipItem.boxColor }}"
            >
              <small
                t-if="tooltipItem.label and typeof tooltipItem.label === 'string'"
                class="o-tooltip-label d-inline-block text-truncate smaller"
                t-out="tooltipItem.label"
                t-attf-style="max-width: {{ labelsMaxWidth }}"
              />
              <small
                t-else=""
                t-foreach="tooltipItem.label"
                t-as="tooltipLabelLine"
                t-key="tooltipLabelLine_index"
                class="o-tooltip-label d-block text-truncate smaller"
                t-out="tooltipLabelLine"
                t-attf-style="max-width: {{ labelsMaxWidth }}"
              />
            </td>
            <td class="o-tooltip-value ps-2 fw-bolder text-end align-top">
              <small class="smaller d-inline-block text-truncate" t-attf-style="max-width: {{ valuesMaxWidth }}">
                <t t-out="tooltipItem.value"/>
                <t t-if="tooltipItem.percentage">
                  (
                  <t t-out="tooltipItem.percentage"/>
                  %)
                </t>
              </small>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </t>
</templates>
`;

let app: App | undefined;

export function renderToString(templateName: string, context: any = {}) {
  return render(templateName, context).innerHTML;
}

function render(templateName: string, context: any = {}) {
  if (!app) {
    app = new App({ templates, translateFn: _t });
  }
  const templateFn = app.getTemplate(templateName);
  const bdom = templateFn(context, {});
  const div = document.createElement("div");
  blockDom.mount(bdom, div);
  return div;
}
