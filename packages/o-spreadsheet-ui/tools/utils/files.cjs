const fs = require("fs");
const path = require("path");

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
