import { App, Component, blockDom } from "@odoo/owl";
import { _t } from "../../../../translation";

const templates = /* xml */ `
<templates>
  <t t-name="o-spreadsheet-CustomTooltip">
    <div
      class="o-custom-tooltip border rounded px-2 py-1 pe-none mw-100 position-absolute text-nowrap shadow opacity-100">
      <table class="overflow-hidden m-0">
        <thead>
          <tr>
            <th class="o-tooltip-title align-baseline border-0" t-esc="title"/>
          </tr>
        </thead>
        <tbody>
          <tr t-foreach="tooltipItems" t-as="tooltipItem" t-key="tooltipItem_index">
            <td>
              <span
                class="badge ps-2 py-2 rounded-0 align-middle"
                t-attf-style="background-color: {{ tooltipItem.boxColor }}"
              > </span>
              <small
                t-if="tooltipItem.label"
                class="o-tooltip-label d-inline-block text-truncate align-middle smaller ms-2"
                t-esc="tooltipItem.label"
              />
            </td>
            <td class="o-tooltip-value ps-2 pt-1 fw-bolder text-end">
              <small class="smaller">
                <t t-esc="tooltipItem.value"/>
                <t t-if="tooltipItem.percentage">
                  (
                  <t t-esc="tooltipItem.percentage"/>
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

const app = new App(Component, { templates, translateFn: _t });

export function renderToString(templateName: string, context: any = {}) {
  return render(templateName, context).innerHTML;
}

function render(templateName: string, context: any = {}) {
  const templateFn = app.getTemplate(templateName);
  const bdom = templateFn(context, {});
  const div = document.createElement("div");
  blockDom.mount(bdom, div);
  return div;
}
