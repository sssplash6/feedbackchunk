/**
 * Freshman Academy — Website Feedback service
 * -------------------------------------------------------------
 *   GET  /                serves the feedback app (public/index.html)
 *   GET  /api/entries     returns all submissions as JSON (feeds the dashboard)
 *   POST /api/submit      saves a submission
 *   GET  /export.pdf      compiles every submission into one PDF
 *
 * Storage: an append-only JSON-lines file on the Render persistent disk.
 * No database, no external services.
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");

const app = express();
app.use(express.json({ limit: "1mb" }));

// --- config via env (with sensible local defaults) ---
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const ORG_NAME = process.env.ORG_NAME || "Freshman Academy";
const DATA_FILE = path.join(DATA_DIR, "feedback.jsonl");
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- storage helpers ----------
function saveEntry(entry) {
  fs.appendFileSync(DATA_FILE, JSON.stringify(entry) + "\n", "utf8");
}
function readEntries() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return fs
    .readFileSync(DATA_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

function str(v, max) {
  return (v == null ? "" : String(v)).trim().slice(0, max);
}

// ---------- serve the app ----------
app.use(express.static(path.join(__dirname, "public")));

// ---------- API ----------
app.get("/api/entries", (req, res) => {
  res.json(readEntries());
});

app.post("/api/submit", (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 80);
  const detail = str(b.detail, 2000);
  const type = str(b.type, 60);
  if (!name || !detail || !type) {
    return res.status(400).json({ ok: false, error: "name, type and detail are required" });
  }
  const entry = {
    id: crypto.randomUUID(),
    name,
    role: str(b.role, 80),
    page: str(b.page, 120),
    type,
    priority: ["High", "Medium", "Low"].includes(b.priority) ? b.priority : "Medium",
    detail,
    ref: str(b.ref, 500),
    timestamp: new Date().toISOString(),
  };
  saveEntry(entry);
  res.json({ ok: true, count: readEntries().length });
});

// ---------- PDF export ----------
function fmtDate(iso) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

app.get("/export.pdf", (req, res) => {
  const entries = readEntries();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Website-Feedback_${new Date().toISOString().slice(0, 10)}.pdf"`
  );

  const doc = new PDFDocument({ size: "A4", margin: 56 });
  doc.pipe(res);

  const NAVY = "#0d1a30", GOLD = "#c69b3c", INK = "#333333", MUTE = "#777777", RED = "#a4402c";
  const left = 56, right = doc.page.width - 56;
  const rule = (color) => { doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor(color).lineWidth(1).stroke(); };

  // Title block
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(10)
    .text("FRESHMAN ACADEMY · WEBSITE REDESIGN", { characterSpacing: 1 });
  doc.moveDown(0.2);
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(22).text("Team Feedback — Compiled Brief");
  doc.moveDown(0.2);
  const high = entries.filter((e) => e.priority === "High").length;
  doc.fillColor(MUTE).font("Helvetica").fontSize(10)
    .text(`Compiled ${fmtDate(new Date().toISOString())}  ·  ${entries.length} entr${entries.length === 1 ? "y" : "ies"}  ·  ${high} high priority`);
  doc.moveDown(0.6);
  rule("#cccccc");
  doc.moveDown(1);

  if (!entries.length) {
    doc.fillColor("#555555").fontSize(12).text("No feedback submitted yet.");
    doc.end();
    return;
  }

  // Group by page, High priority first within each group
  const byPage = {};
  entries.forEach((e) => { (byPage[e.page || "Other"] = byPage[e.page || "Other"] || []).push(e); });
  const order = { High: 0, Medium: 1, Low: 2 };

  Object.keys(byPage).sort().forEach((page) => {
    if (doc.y > doc.page.height - 120) doc.addPage();
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(14).text(page.toUpperCase());
    doc.moveDown(0.3);

    byPage[page].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
    byPage[page].forEach((e) => {
      if (doc.y > doc.page.height - 110) doc.addPage();
      const isHigh = e.priority === "High";
      doc.font("Helvetica-Bold").fontSize(10).fillColor(isHigh ? RED : NAVY)
        .text(`[${e.priority || "Medium"}] `, { continued: true })
        .fillColor(INK).text(`${e.type || "Other"} — ${e.name}${e.role ? " (" + e.role + ")" : ""}`);
      doc.font("Helvetica").fontSize(11).fillColor("#222222").text(e.detail, { align: "left" });
      if (e.ref) {
        doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(GOLD).text(`Reference: ${e.ref}`);
      }
      doc.font("Helvetica").fontSize(8).fillColor("#aaaaaa").text(fmtDate(e.timestamp));
      doc.moveDown(0.7);
    });
    doc.moveDown(0.3);
    rule("#eeeeee");
    doc.moveDown(0.8);
  });

  doc.end();
});

app.listen(PORT, () => {
  console.log(`Feedback service running on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
