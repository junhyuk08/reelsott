#!/usr/bin/env node

/**
 * expo export wipes and regenerates the dist/ output directory, so vercel.json
 * (the SPA-fallback rewrite dynamic routes like /drama/[id] need on refresh)
 * can't just live inside dist/ — it would be deleted on the next export. This
 * copies the version-controlled root vercel.json into dist/ after each export.
 */

const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "vercel.json");
const destination = path.join(__dirname, "..", "dist", "vercel.json");

fs.copyFileSync(source, destination);
