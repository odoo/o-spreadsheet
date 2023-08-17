const watch = require("node-watch");
const bundle = require("./bundle_xml_templates.cjs");

const watcher = watch("./src", { filter: /\.xml$/, recursive: true }, (ev, name) => {
  console.log(`\nFile ${name}: ${ev}`);
  bundle.writeOwlTemplateBundleToFile("build");
});

watcher.on("ready", () => console.log("Watching .xml files..."));
watcher.on("error", (err) => console.error(`Error watching .xml files ${err}`));

process.on("SIGINT", () => watcher.close());
