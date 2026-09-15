const watch = require("node-watch");
const bundle = require("./bundle_xml_templates.cjs");

let timeOutId = undefined;
const watcher = watch("./src", { filter: /\.xml$/, recursive: true }, (ev, name) => {
  console.log(`File ${name}: ${ev}`);
  clearTimeout(timeOutId);
  timeOutId = setTimeout(() => {
    bundle.writeOwlTemplateBundleToFile("build");
  }, 100);
});

bundle.writeOwlTemplateBundleToFile("build");

watcher.on("ready", () => console.log("Watching .xml files..."));
watcher.on("error", (err) => console.error(`Error watching .xml files ${err}`));

process.on("SIGINT", () => watcher.close());
