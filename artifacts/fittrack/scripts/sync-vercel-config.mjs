import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fittrackRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = process.env.VITE_API_URL?.trim().replace(/\/+$/, "");

const rewrites = [];

if (apiUrl) {
  rewrites.push({
    source: "/api/:path*",
    destination: `${apiUrl}/api/:path*`,
  });
}

rewrites.push(
  { source: "/", destination: "/index.html" },
  { source: "/:path((?!api/).*)", destination: "/index.html" },
);

const vercelConfig = { rewrites };

fs.writeFileSync(
  path.join(fittrackRoot, "vercel.json"),
  `${JSON.stringify(vercelConfig, null, 2)}\n`,
);

if (!apiUrl) {
  console.warn(
    "[fittrack] VITE_API_URL is unset: /api/* will not be proxied to Railway. " +
      "Set VITE_API_URL in Vercel (Production) so profile PATCH /api/users/me reaches the API server.",
  );
} else {
  console.log(`[fittrack] vercel.json: proxy /api/* → ${apiUrl}/api/*`);
}
