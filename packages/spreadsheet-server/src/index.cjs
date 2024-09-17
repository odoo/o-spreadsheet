/**
 * This is not suitable for production use!
 * This is only a simplified implementation for demonstration purposes.
 */
const formData = require("express-form-data");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

//add middleware
app.use(cors());
app.use(express.json());
// parse data with connect-multiparty.
app.use(formData.parse(/* options */));
// delete from the request all empty files (size === 0)
app.use(formData.format());
// change the file objects to fs.ReadStream
app.use(formData.stream());
// union the body and the files
app.use(formData.union());

let messages = [];
let serverRevisionId = "START_REVISION";
const imagesDirectory = "./logs/images";

// Creating the log file for this specific session
if (!fs.existsSync("./logs/")) {
  fs.mkdirSync("./logs/");
}
const logFile = fs.createWriteStream(`./logs/log-${Date.now()}`);

// restoring the messages of the previous sessions
const currentSessionFile = "./logs/session.json";
if (fs.existsSync(currentSessionFile)) {
  messages = JSON.parse(fs.readFileSync(currentSessionFile));
  if (messages.length) {
    serverRevisionId = messages[messages.length - 1].nextRevisionId;
  }
  log(`loaded ${messages.length} messages from ${currentSessionFile}`);
}

// save the messages before exiting gracefully
[`SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`].forEach((eventType) => {
  process.on(eventType, (code) => {
    log(`writing ${messages.length} messages to ${currentSessionFile}`);
    fs.writeFileSync(currentSessionFile, JSON.stringify(messages));
    process.exit(code);
  });
});

// setup the socket connection for the clients to connect

const aWss = expressWS.getWss("/");
expressWS.getWss().on("connection", (ws) => {
  log(`Connection: ${messages.length} messages have been sent`);
});

function log(message) {
  const msg = `[${new Date().toLocaleTimeString()}]: ${message}`;
  console.log(msg);
  logFile.write(msg + "\r\n");
}

function logMessage(msg) {
  switch (msg.type) {
    case "REMOTE_REVISION":
      log(`${msg.type}: ${msg.nextRevisionId} : ${JSON.stringify(msg.commands)}`);
      break;
    case "REVISION_UNDONE":
      log(`${msg.type}: ${msg.undoneRevisionId}`);
      break;
    case "REVISION_REDONE":
      log(`${msg.type}: ${msg.redoneRevisionId}`);
      break;
  }
}

function broadcast(message) {
  aWss.clients.forEach(function each(client) {
    client.send(message);
  });
}

app.get("/", function (req, res) {
  res.send(messages);
});

app.get("/clear", function (req, res) {
  messages = [];
  fs.rmSync(imagesDirectory, { recursive: true, force: true });
  serverRevisionId = "START_REVISION";
  log("History cleared");
  res.send("Cleared");
});

app.post("/upload-image", function (req, res) {
  try {
    if (!fs.existsSync(imagesDirectory)) {
      fs.mkdirSync(imagesDirectory);
    }
    const formeData = req.files;
    const readStream = formeData["image"];
    // We use the number of files in the images folder to determined the next file name.
    fs.readdir(imagesDirectory, (err, files) => {
      if (err) {
        log(err);
      } else {
        const file_name = files.length.toString();
        const output = imagesDirectory + "/" + file_name;
        // This opens up the writeable stream to `output`
        const writeStream = fs.createWriteStream(output);
        // This pipes the POST data to the file
        readStream.pipe(writeStream);
        res.send("../" + output);
      }
    });
  } catch (err) {
    log(err);
    throw err;
  }
});

app.ws("/", function (ws, req) {
  ws.on("message", function (message) {
    const msg = JSON.parse(message);
    logMessage(msg);

    switch (msg.type) {
      case "REMOTE_REVISION":
      case "REVISION_UNDONE":
      case "REVISION_REDONE":
        if (msg.serverRevisionId === serverRevisionId) {
          serverRevisionId = msg.nextRevisionId;
          messages.push(msg);
          broadcast(message);
        } else {
          log(
            `Server revision ${serverRevisionId} != message revision ${msg.serverRevisionId}. Message rejected ${message}`
          );
        }
        break;
      case "CLIENT_JOINED":
      case "CLIENT_LEFT":
      case "CLIENT_MOVED":
        broadcast(message);
        break;
    }
  });
});

app.listen(9090, () => {
  console.log("connected to :9090");
});
