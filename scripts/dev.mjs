import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

const serverPort = resolveServerPort();

try {
  await ensurePortAvailable(serverPort);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npmCommand, ["run", "dev:server"], {
    stdio: "inherit",
  }),
  spawn(npmCommand, ["run", "dev:client"], {
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  children.forEach((child) => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  });
  process.exit(code);
}

children.forEach((child) => {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown(code ?? 1);
    }
  });
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function resolveServerPort() {
  const explicitPort = Number(process.env.PORT || "");
  if (Number.isFinite(explicitPort) && explicitPort > 0) {
    return explicitPort;
  }

  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return 3001;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key !== "PORT") {
      continue;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3001;
  }

  return 3001;
}

function ensurePortAvailable(port) {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();

    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            [
              `Port ${port} is already in use, so LUME cannot start its API server.`,
              `If that existing process is your LUME backend, keep it running and use \`npm run dev:client\` instead.`,
              `Otherwise free the port first with \`lsof -ti:${port} | xargs kill -9\`, then rerun \`npm run dev\`.`,
            ].join("\n"),
          ),
        );
        return;
      }

      reject(error);
    });

    probe.listen(port, () => {
      probe.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve();
      });
    });
  });
}
