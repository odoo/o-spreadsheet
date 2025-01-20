const watch = require("node-watch");
const { createScssBundle } = require("./scss.cjs");

const watcher = watch("./src", { filter: /\.scss$/, recursive: true }, (ev, name) => {
  console.log(`\n File ${name}: ${ev}`);
  createScssBundle("build");
});

watcher.on("ready", () => console.log("Watching .scss files..."));
watcher.on("error", (err) => console.error(`Error watching .scss files ${err}`));

process.on("SIGINT", () => watcher.close());
