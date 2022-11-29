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
  lines = lines.filter((line) => {
    return !!line.match(COMMIT_REGEX);
  });
  trim(lines);
  console.log(
    JSON.stringify({
      title,
      version,
      body: lines.join("\n"),
    })
  );
} catch (error) {
  core.setFailed(error.message);
}
