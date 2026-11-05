const http = require("node:http");
const net = require("node:net");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { readFileSync } = require("node:fs");

if (process.platform !== "win32" || !/^project_id = "inventory-assets"\s*$/m.test(readFileSync("supabase/config.toml", "utf8"))) {
  throw new Error("Jalankan skrip ini dari proyek inventory-assets di Docker Desktop Windows.");
}

// Supabase CLI attaches its network after creating containers. Set the
// published address explicitly before Docker Desktop allocates the ports.
const docker = "\\\\.\\pipe\\dockerDesktopLinuxEngine";
const pipeName = "assets-supabase-" + randomBytes(8).toString("hex");
const bridge = "\\\\.\\pipe\\" + pipeName;

function relay(req, res, body) {
  const headers = { ...req.headers };
  if (body) {
    delete headers["transfer-encoding"];
    headers["content-length"] = body.length;
  }
  const upstream = http.request({ socketPath: docker, method: req.method, path: req.url, headers }, (response) => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
  upstream.on("error", () => res.writeHead(502).end());
  if (body) upstream.end(body);
  else req.pipe(upstream);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://docker");
  if (req.method !== "POST" || !url.pathname.endsWith("/containers/create") ||
    !/^supabase_[a-z_]+_inventory-assets$/.test(url.searchParams.get("name") ?? "")) {
    relay(req, res);
    return;
  }
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const config = JSON.parse(Buffer.concat(chunks));
    for (const bindings of Object.values(config.HostConfig?.PortBindings ?? {})) {
      for (const binding of bindings ?? []) binding.HostIp = "127.0.0.1";
    }
    relay(req, res, Buffer.from(JSON.stringify(config)));
  } catch {
    res.writeHead(400).end();
  }
});

server.on("upgrade", (req, socket, head) => {
  const upstream = net.createConnection(docker);
  upstream.on("connect", () => {
    let header = req.method + " " + req.url + " HTTP/" + req.httpVersion + "\r\n";
    for (let index = 0; index < req.rawHeaders.length; index += 2) {
      header += req.rawHeaders[index] + ": " + req.rawHeaders[index + 1] + "\r\n";
    }
    upstream.write(header + "\r\n");
    upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
  socket.on("close", () => upstream.destroy());
});

server.listen(bridge, () => {
  const env = { ...process.env, DOCKER_HOST: "npipe:////./pipe/" + pipeName, SUPABASE_TELEMETRY_DISABLED: "1" };
  delete env.DOCKER_CONTEXT;
  const cli = process.argv[2] ?? "supabase.exe";
  const child = spawn(cli, [
    "start", "-x", "studio,imgproxy,edge-runtime,logflare,vector,realtime,supavisor,postgres-meta,mailpit",
  ], { env, stdio: "inherit" });
  function close(code) {
    server.close();
    server.closeAllConnections();
    process.exitCode = code ?? 1;
  }
  child.on("exit", close);
  child.on("error", () => {
    console.error("Supabase CLI tidak dapat dijalankan.");
    close(1);
  });
});
