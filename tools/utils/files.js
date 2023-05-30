const fs = require("fs");
const path = require("path");

function writeToFile(filepath, data) {
  if (!fs.existsSync(path.dirname(filepath))) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
  }
  fs.writeFile(filepath, data, (err) => {
    if (err) {
      process.stdout.write(`Error while writing file ${filepath}: ${err}`);
      return;
    }
  });
}

exports.writeToFile = writeToFile;
