## Description:

description of this task, what is implemented and why it is implemented that way.

Task: [TASK_ID](https://www.odoo.com/web#id=TASK_ID&action=333&active_id=2328&model=project.task&view_type=form&cids=1&menu_id=4720)

## review checklist

- [ ] undo-able commands (uses this.history.update)
- [ ] multiuser-able commands (has inverse commands and transformations where needed)
- [ ] translations (\_lt("qmsdf %s", abc))
- [ ] unit tested
- [ ] clean commented code
- [ ] feature is organized in plugin, or UI components
- [ ] exportable in excel
- [ ] importable from excel
- [ ] in model/core: ranges are Range object, and can be adapted (adaptRanges)
- [ ] in model/UI: ranges are strings (to show the user)
- [ ] new/updated/removed commands are documented
- [ ] track breaking changes
- [ ] public API change (index.ts) must rebuild doc (npm run doc)
- [ ] code is prettified with prettier (in each commit, no separate commit)
- [ ] status is correct in Odoo
