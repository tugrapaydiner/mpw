// tiny static server, no deps. localhost counts as secure context.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };

createServer(async (req, res) => {
  try {
    const path = normalize(join(root, req.url === "/" ? "public/index.html" : decodeURIComponent(req.url.split("?")[0])));
    if (!path.startsWith(normalize(root))) { res.writeHead(403); res.end(); return; }
    const data = await readFile(path);
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(8000, () => console.log("mpw on http://localhost:8000"));
