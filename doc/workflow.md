# Workflow

### Development

1. Ensure that your feature is linked to an Odoo project.
2. Develop your feature/fix on a dedicated branch.
3. Adapt the code in [odoo-dev/enterprise](https://github.com/odoo-dev/enterprise) to your modifications [1]:
   - Create a dev branch with a separate commit to update `o_spreadsheet.js` [2],
   - make separate commits with your adaptations in `documents_spreadsheet(_bundle)` and improvements [3],
   - _Refer these last commits explicitely in the Odoo project task_,
4. Only create a PR in [odoo/enterprise](https://github.com/odoo/enterprise) if it contains improvements in Odoo.

### Deployment

The update of o_spreadsheet.js in Odoo is exclusively done with the script `sp_tool update`which will create a Pull Request for all supported versions.
If one of the Pull Request does not pass the runbot tests due to an incompatibility with the code in [odoo/enterprise](https://github.com/odoo/enterprise) it is the responsibility of the developper who introduced the regression to modify the Pull Request. If the development flow was properly followed, it should come down to cherry-pick
the adaptaion commits, hence the importance of properly document them properly.

WHen a feature has a counterpart in [odoo/enterprise](https://github.com/odoo/enterprise), it will be merged manually after the update of `o_spreadsheet.js` (Again, by cherry-picking the improvement commits over the recently update base branch).

[1] This is required. Both to test your modifications and offer a test environment for the Product Owner
[2] You can use the command script `sp_tool push`
[3] Adaptations: modifications following breaking changes
