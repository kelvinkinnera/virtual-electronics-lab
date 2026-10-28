
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const MODEL = "llama3.2:1b";
const ROOT = __dirname;

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Open the existing website
  if (
    req.method === "GET" &&
    (req.url === "/" || req.url === "/index.html")
  ) {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });

    fs.createReadStream(path.join(ROOT, "index.html")).pipe(res);
    return;
  }

  // Send a question to Ollama
  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 10000) {
        res.writeHead(413);
        res.end("Question is too long.");
        req.destroy();
      }
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const question = String(data.message || "").trim();

        if (!question) {
          res.writeHead(400, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            error: "Please enter a question."
          }));
          return;
        }

        const response = await fetch(
          "http://127.0.0.1:11434/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: MODEL,
              stream: false,
              messages: [
                {
                  role: "system",
                  content:
                    "You are an electronics tutor for first-year ECE " +
                    "beginners. Use simple English, accurate electronics " +
                    "concepts, formulas, units, and step-by-step calculations. " +
                    "Check arithmetic. Use realistic circuit examples. " +
                    "If a question lacks necessary information, ask for it. " +
                    "If unsure, say so instead of inventing an answer."
                },
                {
                  role: "user",
                  content: question
                }
              ]
            })
          }
        );

        if (!response.ok) {
          throw new Error(
            "Ollama returned HTTP " + response.status
          );
        }

        const result = await response.json();

        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8"
        });

        res.end(JSON.stringify({
          answer: result.message.content
        }));
      } catch (error) {
        console.error(error.message);

        res.writeHead(500, {
          "Content-Type": "application/json; charset=utf-8"
        });

        res.end(JSON.stringify({
          error:
            "Could not contact Ollama. Make sure Ollama is running " +
            "and llama3.2:1b is installed."
        }));
      }
    });

    return;
  }

  res.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    "Virtual Electronics Lab is running at http://127.0.0.1:" + PORT
  );
  console.log("AI model: " + MODEL);
});
