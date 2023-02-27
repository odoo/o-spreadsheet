import watch from "node-watch";
import * as bundle from "./bundle_xml_templates.js";

const watcher = watch("./src", { filter: /\.xml$/, recursive: true }, (ev, name) => {
  console.log(`\nFile ${name}: ${ev}`);
  bundle.writeOwlTemplateBundleToFile();
});

watcher.on("ready", () => console.log("Watching .xml files..."));
watcher.on("error", (err) => console.error(`Error watching .xml files ${err}`));

process.on("SIGINT", () => watcher.close());
