#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const [, , inputHtml, outputPdf] = process.argv;

if (!inputHtml || !outputPdf) {
  console.error("Usage: node export_playbook_pdf.mjs <input.html> <output.pdf>");
  process.exit(1);
}

const htmlPath = path.resolve(inputHtml);
const pdfPath = path.resolve(outputPdf);
const htmlUrl = pathToFileURL(htmlPath).href;

const result = spawnSync(
  "playwright",
  [
    "pdf",
    "--browser",
    "chromium",
    "--paper-format",
    "A4",
    "--wait-for-timeout",
    "300",
    htmlUrl,
    pdfPath,
  ],
  { stdio: "inherit" }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(pdfPath);
