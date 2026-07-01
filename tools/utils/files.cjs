const fs = require("fs");
const path = require("path");

function findFiles(dir, ext) {
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(dir, f))
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

function ensureFilePath(filepath) {
  if (!fs.existsSync(path.dirname(filepath))) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
  }
}
function writeToFile(filepath, data) {
  ensureFilePath(filepath);
  fs.writeFile(filepath, data, (err) => {
    if (err) {
      process.stdout.write(`Error while writing file ${filepath}: ${err}`);
      return;
    }
  });
}

exports.writeToFile = writeToFile;
exports.findFiles = findFiles;
