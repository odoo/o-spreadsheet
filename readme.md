# o-spreadsheet

a.k.a. "Owly Sheet"

Spreadsheet component, written in Owl.

## Prerequisites

install nodejs 12.0 at least

## Scripts

```bash
# install dependencies
npm install

# build o_spreadsheet.js in dist/
npm run build

# build stuff, start a live server, build with --watch
npm run dev

# run the test suite
npm run test
npm run test -- --watch
```

## Code

Most of the code is contained in the following four modules:

- `formulas`
- `functions`
- `model`
- `ui`

## Documentation

See [documentation](doc/readme.md).

## Workflow

The repository relies on Github Workflows to automate the creation of releases
as well as publishing the package on NPM.

# test the workflow

The workflow can be run locally with the help of https://github.com/nektos/act
Bear in mind that it is not a full sandbox, you can run actual commands (like
npm publish). Make sure you adapt said commands to dry runs.

# Contributions

Most of this project is developped internally at [Odoo](https://github.com/odoo/).
External contributions are very welcome!
Internally, we use our own task tracking tool and as such, require the commit
messages to explicitely refer to the tasks to ease the tracking of merged features.
Consequently, internal contributors should append their commit message with the [trailer](https://git-scm.com/docs/git-interpret-trailers) `Task: {taskId}`. See the example below:

```
[IMP] doing Stuff

This commit sure does a lot.
Here is an indepth descripton of the rationale behind this change (...)

(optional) Co-authored-by: Myself Aswell <never_alone@copium.com>
(required) Task: {taskId}
```

If you are an external contributor, you can simply add the [trailer](https://git-scm.com/docs/git-interpret-trailers) `Task: external` at the end of your commit message.
