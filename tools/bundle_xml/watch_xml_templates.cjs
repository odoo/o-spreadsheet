const watch = require("node-watch");
const bundle = require("./bundle_xml_templates.cjs");

const watcher = watch(
  "./packages/o-spreadsheet-web/src",
  { filter: /\.xml$/, recursive: true },
  (ev, name) => {
    console.log(`\n File ${name}: ${ev}`);
    bundle.writeOwlTemplateBundleToFile("build");
  }
);

watcher.on("ready", () => console.log("Watching .xml files..."));
watcher.on("error", (err) => console.error(`Error watching .xml files ${err}`));

process.on("SIGINT", () => watcher.close());
