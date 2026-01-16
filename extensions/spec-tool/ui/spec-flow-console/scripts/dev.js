#!/usr/bin/env node

const { execSync, spawn } = require("child_process");

const PORT = process.env.PORT || "8840";

function freePort(port) {
  try {
    const output = execSync(`lsof -ti:${port}`, {
      stdio: ["pipe", "pipe", "ignore"],
    })
      .toString()
      .trim();

    if (output) {
      const pids = output.split("\n").filter(Boolean);
      if (pids.length) {
        execSync(`kill -9 ${pids.join(" ")}`, {
          stdio: ["ignore", "ignore", "ignore"],
        });
        console.log(`[dev] Freed port ${port} (killed ${pids.join(", ")})`);
      }
    }
  } catch (error) {
    // nothing listening on the port
  }
}

freePort(PORT);

const child = spawn(
  "pnpm",
  ["exec", "next", "dev", "--port", PORT],
  { stdio: "inherit", shell: true }
);

child.on("close", (code) => process.exit(code));
