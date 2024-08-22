## Description:

description of this task, what is implemented and why it is implemented that way.

Task: [TASK_ID](https://www.odoo.com/web#id=TASK_ID&action=333&active_id=2328&model=project.task&view_type=form&cids=1&menu_id=4720)

## review checklist

- [ ] feature is organized in plugin, or UI components
- [ ] support of duplicate sheet (deep copy)
- [ ] in model/core: ranges are Range object, and can be adapted (adaptRanges)
- [ ] in model/UI: ranges are strings (to show the user)
- [ ] undo-able commands (uses this.history.update)
- [ ] multiuser-able commands (has inverse commands and transformations where needed)
- [ ] new/updated/removed commands are documented
- [ ] exportable in excel
- [ ] translations (\_lt("qmsdf %s", abc))
- [ ] unit tested
- [ ] clean commented code
- [ ] track breaking changes
- [ ] doc is rebuild (npm run doc)
- [ ] status is correct in Odoo