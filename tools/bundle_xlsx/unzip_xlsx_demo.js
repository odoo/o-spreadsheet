const { exec } = require("child_process");

let unzipXlsxCommand = "sh ./tools/bundle_xlsx/unzip_xlsx_demo.sh";
if (process.platform === "win32") {
  exec("where wsl", (error) => {
    if (error !== null) {
      console.error(`This script needs wsl to be installed to run on windows`);
      process.exit(1);
    }
  });

  unzipXlsxCommand = "wsl " + unzipXlsxCommand;
}

exec(unzipXlsxCommand, (error, stdout, stderr) => {
  console.log(stdout);
  console.log(stderr);
  if (error !== null) {
    console.log(`exec error: ${error}`);
  }
});
