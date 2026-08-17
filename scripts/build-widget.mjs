#!/usr/bin/env node
/**
 * Build inmutable del widget para CDN:
 * public/w/rastro@VERSION.js + public/w/rastro.js (alias latest)
 */
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION = "0.4.0";
const root = path.join(__dirname, "..");
const entry = path.join(root, "widget", "rastro.js");
const outDir = path.join(root, "public", "w");

fs.mkdirSync(outDir, { recursive: true });
const outfile = path.join(outDir, `rastro@${VERSION}.js`);
await esbuild.build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  minify: true,
  target: ["es2018"],
  format: "iife",
  legalComments: "none",
});
fs.copyFileSync(outfile, path.join(outDir, "rastro.js"));
const bytes = fs.statSync(outfile).size;
console.log(`widget ${VERSION}: ${bytes} bytes (~${(bytes / 1024).toFixed(1)} KB raw)`);
