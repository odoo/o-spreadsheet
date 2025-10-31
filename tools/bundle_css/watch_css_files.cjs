const watch = require("node-watch");
const { createCSSBundle } = require("./css.cjs");

const watcher = watch("./src", { filter: /\.css$/, recursive: true }, (ev, name) => {
  console.log(`\n File ${name}: ${ev}`);
  try {
    createCSSBundle("build");
  } catch (error) {
    console.error("Error creating CSS bundle:", error.message);
  }
});

try {
  createCSSBundle("build");
} catch (error) {
  console.error("Error creating CSS bundle:", error.message);
}

watcher.on("ready", () => console.log("Watching .css files..."));
watcher.on("error", (err) => console.error(`Error watching .css files ${err}`));

process.on("SIGINT", () => watcher.close());
