
/**
 * This script is used to parse the a commit message and extract the release version as well as the changelog
 * in the form of the commit body. It is therefore the responsability of the developer that creates the release
 * commit to properly document the changes in the commit message.
 * 
 * The commit message should follow the following format:
 * - the first line should contain the version number in the form of (saas-)<major>.<minor>.<patch>
 * - each subsequent line should contain a tag in the form of [TAG]
 * 
 * Note that every line that does not match the above format will be ignored.
 * 
 * 
 * The script is used in the release workflow andd as such, relies on the GitHub API to retrieve the commit message.
 * It uses @action/core and @action/github in order to access to the workflow commands
 * and octokit REST client to interact with the GitHub API.
 * 
 * See https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action
 *     https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action#adding-actions-toolkit-packages
 * 
 * This script and the parent workflow can be tested locally by using the test environment provided here:
 * https://github.com/nektos/act
*/

const core = require("@actions/core");
const github = require("@actions/github");

function trim(array) {
  while (["", "\n"].includes(array[0])) {
    array.shift();
  }
  while (["", "\n"].includes(array[array.length - 1])) {
    array.pop();
  }
}

const COMMIT_REGEX = /\[[A-Z]{3}\]/;
const RELEASE_REGEX = /(?:saas-)?\d+\.\d+\.\d+/;

/** wrap in try catch for early exit */
try {
  /** @type {String} */
  const commit_message = github.context.payload.head_commit.message;
  let lines = commit_message.split("\n");
  const title = lines.shift();

  let version = title.match(RELEASE_REGEX);
  // throw if no version
  version = version[0];

  // purge non commit lines
  const commitLines = lines.filter((line) => !!line.match(COMMIT_REGEX));
  trim(commitLines);
  console.log(
    JSON.stringify({
      title,
      version,
      body: commitLines.join("\n"),
    })
  );
} catch (error) {
  core.setFailed(error.message);
}
