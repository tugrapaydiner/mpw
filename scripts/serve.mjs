// tiny static server, no deps. localhost counts as secure context.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const candidates = [
      normalize(join(root, req.url === "/" ? "public/index.html" : urlPath)),
      normalize(join(root, "public", urlPath)),
    ];
    let data = null;
    let path = candidates[0];
    for (const c of candidates) {
      if (!c.startsWith(normalize(root))) continue;
      try {
        data = await readFile(c);
        path = c;
        break;
      } catch {}
    }
    if (data === null) throw new Error("missing");
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(8000, () => console.log("mpw on http://localhost:8000"));
