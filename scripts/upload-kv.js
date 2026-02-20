#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE_DIR = path.join(__dirname, '..', 'site');
const WRANGLER_CONFIG = path.join(__dirname, '..', 'config', 'wrangler-site.toml');
const KV_NAMESPACE = 'SITE_KV';

const PAGE_FILES = ['index.html', 'lore.html', 'gameplay.html', 'ecosystem.html', 'bridge.html', 'covenant.html', 'connect.html'];
const ASSET_DIRS = ['js', 'img', 'img/icons'];
const ROOT_ASSETS = ['sitemap.xml', 'robots.txt'];

function run(cmd) {
  console.log(`  $ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (e) {
    console.error(`  FAILED: ${e.message}`);
  }
}

console.log();
console.log('  Uploading to Cloudflare KV...');
console.log();

for (const file of PAGE_FILES) {
  const filePath = path.join(SITE_DIR, file);
  if (fs.existsSync(filePath)) {
    const key = `page:${file}`;
    run(`npx wrangler kv:key put --binding=${KV_NAMESPACE} -c ${WRANGLER_CONFIG} "${key}" --path="${filePath}"`);
  }
}

for (const dir of ASSET_DIRS) {
  const dirPath = path.join(SITE_DIR, dir);
  if (!fs.existsSync(dirPath)) continue;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const full = path.join(dirPath, file);
    if (!fs.statSync(full).isFile()) continue;
    const key = `asset:${dir}/${file}`;
    run(`npx wrangler kv:key put --binding=${KV_NAMESPACE} -c ${WRANGLER_CONFIG} "${key}" --path="${full}"`);
  }
}

for (const file of ROOT_ASSETS) {
  const filePath = path.join(SITE_DIR, file);
  if (fs.existsSync(filePath)) {
    run(`npx wrangler kv:key put --binding=${KV_NAMESPACE} -c ${WRANGLER_CONFIG} "asset:${file}" --path="${filePath}"`);
  }
}

console.log();
console.log('  KV upload complete.');
console.log();
