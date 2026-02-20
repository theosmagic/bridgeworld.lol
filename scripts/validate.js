#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');

const REQUIRED_PAGES = ['index.html', 'lore.html', 'gameplay.html', 'ecosystem.html', 'bridge.html', 'covenant.html', 'connect.html'];
const REQUIRED_JS = ['atlas_portal.js', 'b00_fund_transfer.js', 'smart_sessions.js', 'signature.js', 'diamond_portal.js', 'decision_engine.js', 'autonomous_capabilities.js'];
const REQUIRED_WORKERS = ['site-worker.js', 'agent-worker.js', 'idp-worker.js'];

let errors = 0;
let warnings = 0;

function check(filePath, label) {
  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    console.log(`  OK  ${label} (${(size/1024).toFixed(1)}K)`);
  } else {
    console.log(`  MISSING  ${label}`);
    errors++;
  }
}

console.log();
console.log('  BRIDGEWORLD.LOL — Validation');
console.log('  ════════════════════════════');
console.log();

console.log('  PAGES:');
for (const page of REQUIRED_PAGES) check(path.join(SITE, page), page);
console.log();

console.log('  JS:');
for (const js of REQUIRED_JS) check(path.join(SITE, 'js', js), `js/${js}`);
console.log();

console.log('  WORKERS:');
for (const w of REQUIRED_WORKERS) check(path.join(ROOT, 'workers', w), `workers/${w}`);
console.log();

console.log('  CONFIG:');
check(path.join(ROOT, 'config', 'wrangler-site.toml'), 'wrangler-site.toml');
check(path.join(ROOT, 'config', 'wrangler-agent.toml'), 'wrangler-agent.toml');
console.log();

console.log('  IMAGES:');
const imgDir = path.join(SITE, 'img');
if (fs.existsSync(imgDir)) {
  const imgs = fs.readdirSync(imgDir).filter(f => fs.statSync(path.join(imgDir, f)).isFile());
  console.log(`  ${imgs.length} image files`);
} else {
  console.log('  MISSING img directory');
  errors++;
}
console.log();

const tp = path.join(ROOT, 'TreasureProject');
if (fs.existsSync(tp)) {
  const repos = fs.readdirSync(tp).filter(f => fs.statSync(path.join(tp, f)).isDirectory());
  console.log(`  REFERENCE: ${repos.length} TreasureProject repos available`);
} else {
  console.log('  REFERENCE: TreasureProject not found (optional)');
  warnings++;
}
console.log();

const verdict = errors > 0 ? 'INCOMPLETE' : warnings > 0 ? 'READY (with warnings)' : 'READY TO DEPLOY';
console.log(`  VERDICT: ${verdict} (${errors} errors, ${warnings} warnings)`);
console.log();
