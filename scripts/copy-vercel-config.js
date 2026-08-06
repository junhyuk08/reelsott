#!/usr/bin/env node

/**
 * expo export wipes and regenerates the dist/ output directory, so vercel.json
 * (the SPA-fallback rewrite dynamic routes like /drama/[id] need on refresh)
 * can't just live inside dist/ — it would be deleted on the next export. This
 * copies the version-controlled root vercel.json into dist/ after each export.
 *
 * It also works around a Vercel CLI upload quirk: files nested under any
 * directory literally named node_modules are silently dropped from the
 * deployment (confirmed empirically — an empty .vercelignore does NOT
 * override it, so this isn't .gitignore-driven; it looks hardcoded in the
 * uploader itself). Metro's web export nests @expo/vector-icons' font files
 * under assets/node_modules/..., so those files 404 on the deployed site and
 * every icon silently falls back to a missing-glyph box. Renaming that
 * folder and rewriting the (plain-string, unhashed) path in every bundled
 * JS/CSS/HTML file keeps the assets reachable without the offending name.
 */

const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");

fs.copyFileSync(path.join(__dirname, "..", "vercel.json"), path.join(distDir, "vercel.json"));
fs.writeFileSync(path.join(distDir, ".vercelignore"), "");

const OLD_SEGMENT = "node_modules";
const NEW_SEGMENT = "vendor-modules";
const oldDir = path.join(distDir, "assets", OLD_SEGMENT);
const newDir = path.join(distDir, "assets", NEW_SEGMENT);

if (fs.existsSync(oldDir)) {
  // Copy-then-remove instead of a plain rename — renameSync intermittently
  // hits EPERM here on Windows, likely a transient lock from an indexer/AV
  // scan on the just-written directory.
  fs.cpSync(oldDir, newDir, { recursive: true });
  fs.rmSync(oldDir, { recursive: true, force: true });

  const oldPathString = `assets/${OLD_SEGMENT}/`;
  const newPathString = `assets/${NEW_SEGMENT}/`;
  const rewritableFile = /\.(js|css|html|json)$/;

  for (const filePath of walk(distDir)) {
    if (!rewritableFile.test(filePath)) continue;
    const contents = fs.readFileSync(filePath, "utf8");
    if (!contents.includes(oldPathString)) continue;
    fs.writeFileSync(filePath, contents.split(oldPathString).join(newPathString));
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}
