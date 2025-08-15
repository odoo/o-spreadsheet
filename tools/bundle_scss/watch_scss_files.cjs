const watch = require("node-watch");
const { createScssBundle } = require("./scss.cjs");

const watcher = watch(
  "./packages/o-spreadsheet/src",
  { filter: /\.scss$/, recursive: true },
  (ev, name) => {
    console.log(`\n File ${name}: ${ev}`);
    try {
      createScssBundle("build");
    } catch (error) {
      console.error("Error creating SCSS bundle:", error.message);
    }
  }
);

watcher.on("ready", () => console.log("Watching .scss files..."));
watcher.on("error", (err) => console.error(`Error watching .scss files ${err}`));

process.on("SIGINT", () => watcher.close());
