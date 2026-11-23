import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import sirv from "sirv";

const basePath = "/streak-jar";
const serveExport = sirv(fileURLToPath(new URL("../out/", import.meta.url)), {
  extensions: ["html"],
  single: false,
});

createServer((req, res) => {
  if (!req.url?.startsWith(`${basePath}/`)) {
    res.writeHead(404).end("Not found");
    return;
  }

  // Strip only the mount prefix so query-bearing detail URLs still resolve.
  req.url = req.url.slice(basePath.length);
  serveExport(req, res);
}).listen(4173, "127.0.0.1");
