#!/usr/bin/env node
// THEOS CONFIG — Full infrastructure
// Alchemy (all chains), Tenderly, GoldSky, Blockscout, Zapper, Ngrok, Cloudflare

const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, 'env.txt');

function loadEnv() {
  const env = {};
  if (!fs.existsSync(ENV_PATH)) return env;
  const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^export\s+([A-Za-z_0-9]+)=(.+)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return env;
}

function stripChainPrefix(addr) {
  if (!addr) return addr;
  return addr.replace(/^[a-z0-9]+:/, '');
}

const ENV = loadEnv();
const ALCHEMY_KEY = ENV.ALCHEMY_API;

const config = {
  alchemy: {
    api: ALCHEMY_KEY,
    rpc: {
      ethereum:    `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      ethereum_beacon: `https://eth-mainnetbeacon.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      arbitrum:    `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      polygon:     `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      base:        `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      zksync:      `https://zksync-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      scroll:      `https://scroll-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      bnb:         `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      ronin:       `https://ronin-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      apechain:    `https://apechain-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      zora:        `https://zora-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      astar:       `https://astar-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      moonbeam:    `https://moonbeam-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      abstract:    `https://abstract-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      degen:       `https://degen-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      ink:         `https://ink-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      hyperliquid: `https://hyperliquid-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      unichain:    `https://unichain-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      story:       `https://story-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      mythos:      `https://mythos-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      solana:      `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      monad:       `https://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      tron:        `https://tron-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      bitcoin:     `https://bitcoin-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    },
    ws: {
      ethereum:    `wss://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      arbitrum:    `wss://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      polygon:     `wss://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      base:        `wss://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      zksync:      `wss://zksync-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      scroll:      `wss://scroll-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      bnb:         `wss://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      ronin:       `wss://ronin-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      apechain:    `wss://apechain-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      zora:        `wss://zora-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      astar:       `wss://astar-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      abstract:    `wss://abstract-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      degen:       `wss://degen-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      ink:         `wss://ink-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      hyperliquid: `wss://hyperliquid-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      unichain:    `wss://unichain-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      story:       `wss://story-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      mythos:      `wss://mythos-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      monad:       `wss://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    },
    webhookKey: ENV.ALCHEMY_WEBHOOK_SIGN_IN_KEY,
  },

  tenderly: {
    accessKey: ENV.TENDERLY_ACCESS_KEY,
    username: ENV.TENDERLY_USERNAME,
    project: ENV.TENDERLY_PROJECT,
    api: `https://api.tenderly.co/api/v1/account/${ENV.TENDERLY_USERNAME}/project/${ENV.TENDERLY_PROJECT}`,
  },

  goldsky: {
    api: ENV.GOLDENSKY_SUBGRAPH_API,
    subgraphs: {
      bridgeworld: `https://api.goldsky.com/api/public/${ENV.GOLDENSKY_SUBGRAPH_API}/subgraphs/bridgeworld/prod/gn`,
      magicswap: `https://api.goldsky.com/api/public/${ENV.GOLDENSKY_SUBGRAPH_API}/subgraphs/magicswap/prod/gn`,
      corruption: `https://api.goldsky.com/api/public/${ENV.GOLDENSKY_SUBGRAPH_API}/subgraphs/bridgeworld-corruption/prod/gn`,
      governance: `https://api.goldsky.com/api/public/${ENV.GOLDENSKY_SUBGRAPH_API}/subgraphs/governance-staking/prod/gn`,
    },
  },

  blockscout: {
    arbitrum: 'https://arbitrum.blockscout.com/api',
    ethereum: 'https://eth.blockscout.com/api',
    base: 'https://base.blockscout.com/api',
    polygon: 'https://polygon.blockscout.com/api',
    scroll: 'https://scroll.blockscout.com/api',
    zksync: 'https://zksync.blockscout.com/api',
  },

  zapper: {
    api: ENV.ZAPPER_API,
    endpoint: 'https://api.zapper.xyz/v2',
  },

  ngrok: {
    authtoken: ENV.NGROK_AUTHTOKEN,
    webUrl: ENV.NGROK_WEB_URL,
  },

  cloudflare: {
    accountId: ENV.CLOUDFLARE_ACCOUNT_ID,
    zoneId: ENV.CLOUDFLARE_ZONE_ID,
    globalApi: ENV.CLOUDFLARE_GLOBAL_API,
    accessSecret: ENV.CLOUDFLAREACCESS_SECRET,
    accessClientId: ENV.CLOUDFLAREACCESS_CLIENT_ID,
    caKey: ENV.CLOUDFLARE_ORIGINAL_CA_KEY,
  },

  ai: {
    openai: ENV.OPENAI_API,
    warp: ENV.WARP_API,
    youAgent: ENV.YOU_AGENT_API,
    cursorAgent: ENV.CURSOR_AGENT_API,
    agentKey: ENV.AGENT_API_KEY,
    renderJules: ENV.RENDER_JULES_API,
  },

  git: {
    githubSecret: ENV.GITHUB_SECRET,
    gitlabToken: ENV.GITLAB_TOKEN,
    pemPath: ENV.GITHUB_PEM_PATH,
    pemSha256: ENV.GITHUB_PEM_SHA256,
  },

  wallets: {
    primary: stripChainPrefix(ENV.PUBLIC_PRIMARY_ADDRESS),
    safe: stripChainPrefix(ENV.PUBLIC_SAFE_WALLET_ADDRESS),
    safeRaw: ENV.PUBLIC_SAFE_WALLET_ADDRESS,
    ens: ENV.ENS,
    ethermail: ENV.ETHERMAIL,
    personalEmail: ENV.PERSONAL_EMAIL,
  },

  domain: ENV.PUBLIC_DOMAIN,
  subDomain: ENV.SUB_PRIVATE_DOMAIN,
  hostname: ENV.HOSTNAME,

  safe: {
    arbitrum: 'https://safe-transaction-arbitrum.safe.global',
    ethereum: 'https://safe-transaction-mainnet.safe.global',
    polygon: 'https://safe-transaction-polygon.safe.global',
    base: 'https://safe-transaction-base.safe.global',
    bnb: 'https://safe-transaction-bsc.safe.global',
    scroll: 'https://safe-transaction-scroll.safe.global',
  },
};

module.exports = { config, ENV, loadEnv };
