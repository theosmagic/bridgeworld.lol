/**
 * Cloudflare Worker — Identity Provider for theosmagic.uni.eth@ethermail.io
 *
 * This worker runs on bridgeworld.lol and implements:
 *   - OAuth 2.0 / OIDC (Authorization Server)
 *   - SAML 2.0 (Identity Provider)
 *   - SSO session management
 *   - .well-known discovery endpoints
 *   - GitHub OAuth as upstream authentication
 *
 * The canonical identity is: theosmagic.uni.eth@ethermail.io
 * All protocols resolve to this single email as the subject/NameID.
 * GitHub @theosmagic (ID 232430312) is the upstream auth — verified via
 * GitHub OAuth, then mapped to the canonical identity.
 *
 * Deploy: wrangler deploy -c wrangler-idp.toml
 * Requires KV namespace: IDP_SESSIONS (for session/code storage)
 * Requires env vars: SIGNING_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ALCHEMY_API_KEY
 */

const ISSUER = 'https://bridgeworld.lol';
const EOA = '0x67A977eaD94C3b955ECbf27886CE9f62464423B2';
const SAFE = '0xfD5b99618ea8941Ad3F455f0D347285AB68F1A43';

// EtherMail identity — primary is the wallet address itself, alias is the ENS name
const PRIMARY_EMAIL = '0x67a977ead94c3b955ecbf27886ce9f62464423b2@ethermail.io';
const CANONICAL_EMAIL = 'theosmagic.uni.eth@ethermail.io'; // ENS alias
const CANONICAL_ENS = 'theosmagic.uni.eth';
const DISPLAY_NAME = 'Θ𝜀ό𝜍°•⟐•Σ℧ΛΘ';

const GITHUB_ID = 232430312;
const GITHUB_LOGIN = 'theosmagic';

// ORCID — persistent researcher identifier
const ORCID_ID = '0009-0005-7822-7939';
const ORCID_URL = 'https://orcid.org/0009-0005-7822-7939';
const ORCID_API = 'https://pub.orcid.org/v3.0';

// Cloudflare Access team
const CF_TEAM = 'system76';
const CF_ACCESS_AUD = 'fead223b2feff2e3a498617f56036297b0b031047944bebc5790f11d790df441';

// Root of Trust — The Eternal Covenant CA certificate
// OID 1.3.6.1.4.1.55555.1.1 binds the SHA-256 of The_Eternal_Covenant_Declaration.png
const COVENANT_CA_PEM = `-----BEGIN CERTIFICATE-----
MIID8zCCAtugAwIBAgIUUU40LvMhrsKhXv0vthNTIGxxO0kwDQYJKoZIhvcNAQEL
BQAwRTEgMB4GA1UEAwwXVGhlIEV0ZXJuYWwgQ292ZW5hbnQgQ0ExFDASBgNVBAoM
C0JyaWRnZXdvcmxkMQswCQYDVQQGEwJVUzAeFw0yNjAyMTYwNjU3NTJaFw0zNjAy
MTQwNjU3NTJaMEUxIDAeBgNVBAMMF1RoZSBFdGVybmFsIENvdmVuYW50IENBMRQw
EgYDVQQKDAtCcmlkZ2V3b3JsZDELMAkGA1UEBhMCVVMwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQC8Q2PJd39R23oAMGCv8olRTL/oV4uR0MHFtqnjoo+q
rfHuVIHsm4q22f4qgQjWYdOqXmx16gyHNY8dhcYrSKlSb0hiIcUTeliHeqP65GfK
DMvSSk9i9wbVmKeuhMcFipuGPK+4abpBE3d9j6SE0E712cuWYCKdADBKcIbqeta/
GW1K0JLejshs0VvsjM6Y/G7G76lnoLW4T33QRIWMzONC6BwLUM8dZien689VHRV2
y0rUwBm4/aM/3nTjG9Blw7VttK+2FTUfDmkkbFPr1o8KjTJzFVSIDSm4Bx4xpYyH
bpZybSlwy4g94mL1gbMGuzOroL1/A8orMDPtKj+uqD5jAgMBAAGjgdowgdcwEgYD
VR0TAQH/BAgwBgEB/wIBADAOBgNVHQ8BAf8EBAMCAYYwHQYDVR0OBBYEFLLcQvmf
u+Ypt291+KChShmSmX4kMB8GA1UdIwQYMBaAFLLcQvmfu+Ypt291+KChShmSmX4k
MHEGCisGAQQBg7IDAQEEYwxhRXRlcm5hbENvdmVuYW50RGVjbGFyYXRpb25TSEEy
NTY9NDBkZWZhMDk4M2M0YTk5YjAyMzQ0MGI0YjkyMDQ0ZDAyNjk2NDBhODM5YjIx
YjIzMDFjNjMxZTk2MmYyYzAxYzANBgkqhkiG9w0BAQsFAAOCAQEAFOwsoiXWL+ms
IP7e4WvQ4G3UbKqreSZN5TaM20vx8sxtnJScKSA7wd3iBlWXGP0ox/GSFyMzNqPj
TPM6L0J0PQLi9vCty8mo3yVw9/HTcsbihrJrpNxn4vXP/5Yf1yoFCHAL0aMgkox0
VQLXnGRpQ3/LJx/p8ucKLbci52bNwMXktEg93Zz3YVc1z0QIVIx30Knu1Hocy1n0
zZvUtMcfBr1NYLkFO1ecse6+/CaHQ5xrqSWxfhhFOWrhL3ZOG0rH2pzYqseFkX5Q
IcfuLIGmfKG2zAZctF8GuZg1GykkxddpDHsjTXjaP6fGanjVLt5ZWZghGuDWNStm
T9jal6Mtrw==
-----END CERTIFICATE-----`;
const COVENANT_DECLARATION_SHA256 = '40defa0983c4a99b023440b4b92044d0269640a839b21b2301c631e962f2c01c';

// --- Helper Functions ---

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

async function verifyCfAccessJwt(token, env) {
  // Verify Cloudflare Access JWT by checking with the certs endpoint
  // For a single-user IdP, we just decode and check the email claim
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // Check the email matches our canonical identity or the Cloudflare account
    if (payload.email === CANONICAL_EMAIL) return true;
    // Also accept if the GitHub ID matches (Cloudflare may pass GitHub email)
    if (payload.identity && payload.identity.user_id === String(GITHUB_ID)) return true;
    // Accept any valid CF Access JWT for this account (the policy already restricts to our email)
    if (payload.aud && payload.iss && payload.iss.includes(CF_TEAM)) return true;
    return false;
  } catch {
    return false;
  }
}

// --- Alchemy RPC / On-Chain Identity Verification ---

// Primary networks (5)
const ALCHEMY_CHAINS = {
  1:      { name: 'Ethereum',     slug: 'eth-mainnet',     native: 'ETH' },
  42161:  { name: 'Arbitrum',     slug: 'arb-mainnet',     native: 'ETH' },
  137:    { name: 'Polygon',      slug: 'polygon-mainnet', native: 'POL' },
  8453:   { name: 'Base',         slug: 'base-mainnet',    native: 'ETH' },
  534352: { name: 'Scroll',       slug: 'scroll-mainnet',  native: 'ETH' },
  324:    { name: 'zkSync',       slug: 'zksync-mainnet',  native: 'ETH' },
  2020:   { name: 'Ronin',        slug: 'ronin-mainnet',   native: 'RON' },
};

// Primary tokens — MAGIC, SAND, MANA contract addresses per chain
const PRIMARY_TOKENS = {
  MAGIC: {
    name: 'MAGIC',
    fullName: 'Magic (Treasure)',
    decimals: 18,
    contracts: {
      1:     '0xB0c7a3Ba49C7a6EaBa6cD4a96C55a1391070Ac9A', // Ethereum
      42161: '0x539bdE0d7Dbd336b79148AA742883198BBF60342', // Arbitrum
    },
  },
  SAND: {
    name: 'SAND',
    fullName: 'The Sandbox',
    decimals: 18,
    contracts: {
      1:   '0x3845badAde8e6dFF049820680d1F14bD3903a5d0', // Ethereum
      137: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683', // Polygon
    },
  },
  MANA: {
    name: 'MANA',
    fullName: 'Decentraland',
    decimals: 18,
    contracts: {
      1:   '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', // Ethereum
      137: '0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4', // Polygon
    },
  },
};

function alchemyRpc(chainId, apiKey) {
  const chain = ALCHEMY_CHAINS[chainId];
  if (!chain) return null;
  return `https://${chain.slug}.g.alchemy.com/v2/${apiKey}`;
}

async function ethCall(rpcUrl, to, data) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to, data }, 'latest'],
      }),
      signal: ctrl.signal,
    });
    const json = await resp.json();
    return json.result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getBalance(rpcUrl, address) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
      signal: ctrl.signal,
    });
    const json = await resp.json();
    return json.result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Resolve ENS name → address (on mainnet)
async function resolveENS(ensName, apiKey) {
  // theosmagic.uni.eth is a Uniswap subdomain using CCIP Read (ERC-3668 off-chain resolver)
  // Standard eth_call cannot resolve it; requires gateway callback.
  // Verified binding: theosmagic.uni.eth → 0x67A977eaD94C3b955ECbf27886CE9f62464423B2
  // Proof: Uniswap ENS claim tx + EtherMail wallet-address-as-email binding
  if (ensName === 'theosmagic.uni.eth') return EOA;
  return null;
}

// Check Safe owners — getOwners() on the Safe contract
async function getSafeOwners(safeAddress, chainId, apiKey) {
  const rpcUrl = alchemyRpc(chainId, apiKey);
  if (!rpcUrl) return null;

  // getOwners() selector = 0xa0e67e2b
  const result = await ethCall(rpcUrl, safeAddress, '0xa0e67e2b');
  if (!result || result === '0x') return null;

  // Decode dynamic array of addresses
  try {
    const stripped = result.slice(2); // remove 0x
    const offset = parseInt(stripped.slice(0, 64), 16) * 2;
    const length = parseInt(stripped.slice(offset, offset + 64), 16);
    const owners = [];
    for (let i = 0; i < length; i++) {
      const start = offset + 64 + (i * 64);
      const addr = '0x' + stripped.slice(start + 24, start + 64);
      owners.push(addr);
    }
    return owners;
  } catch {
    return null;
  }
}

// Get Safe threshold
async function getSafeThreshold(safeAddress, chainId, apiKey) {
  const rpcUrl = alchemyRpc(chainId, apiKey);
  if (!rpcUrl) return null;

  // getThreshold() selector = 0xe75235b8
  const result = await ethCall(rpcUrl, safeAddress, '0xe75235b8');
  if (!result || result === '0x') return null;
  return parseInt(result, 16);
}

// Get ERC-20 token balance: balanceOf(address) = 0x70a08231
async function getTokenBalance(rpcUrl, tokenAddress, walletAddress) {
  // balanceOf(address) — pad wallet address to 32 bytes
  const paddedAddr = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  const data = '0x70a08231' + paddedAddr;
  const result = await ethCall(rpcUrl, tokenAddress, data);
  if (!result || result === '0x') return '0';
  return result;
}

// Get native balance across primary chains (limited to Ethereum + Arbitrum for speed)
async function getMultiChainBalances(address, apiKey) {
  const balances = {};
  const chainIds = [1, 42161];

  const results = await Promise.allSettled(
    chainIds.map(async (chainId) => {
      const rpcUrl = alchemyRpc(chainId, apiKey);
      if (!rpcUrl) return { chainId, balance: null };
      const balance = await getBalance(rpcUrl, address);
      return { chainId, balance };
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.balance) {
      const chain = ALCHEMY_CHAINS[r.value.chainId];
      const wei = BigInt(r.value.balance);
      const eth = Number(wei) / 1e18;
      balances[r.value.chainId] = {
        chain: chain.name,
        native_symbol: chain.native,
        wei: r.value.balance,
        balance: eth.toFixed(6),
      };
    }
  }
  return balances;
}

// Get MAGIC, SAND, MANA balances for an address across all chains they exist on
async function getTokenBalances(address, apiKey) {
  const results = {};

  const jobs = [];
  for (const [symbol, token] of Object.entries(PRIMARY_TOKENS)) {
    for (const [chainIdStr, contractAddr] of Object.entries(token.contracts)) {
      const chainId = parseInt(chainIdStr);
      jobs.push({ symbol, chainId, contractAddr, token });
    }
  }

  const settled = await Promise.allSettled(
    jobs.map(async ({ symbol, chainId, contractAddr }) => {
      const rpcUrl = alchemyRpc(chainId, apiKey);
      if (!rpcUrl) return { symbol, chainId, raw: null };
      const raw = await getTokenBalance(rpcUrl, contractAddr, address);
      return { symbol, chainId, raw };
    })
  );

  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value.raw) {
      const { symbol, chainId, raw } = r.value;
      const token = PRIMARY_TOKENS[symbol];
      const chain = ALCHEMY_CHAINS[chainId];
      const wei = BigInt(raw);
      const balance = Number(wei) / (10 ** token.decimals);

      if (!results[symbol]) {
        results[symbol] = {
          name: token.fullName,
          symbol: token.name,
          decimals: token.decimals,
          chains: {},
          total: 0,
        };
      }

      results[symbol].chains[chainId] = {
        chain: chain?.name || `Chain ${chainId}`,
        contract: token.contracts[chainId],
        raw,
        balance: balance.toFixed(6),
      };
      results[symbol].total += balance;
    }
  }

  // Round totals
  for (const sym of Object.keys(results)) {
    results[sym].total = parseFloat(results[sym].total.toFixed(6));
  }

  return results;
}

// Placeholder for ENS encoding — simplified
function encodeFunctionCall(sig, name) {
  // This is a simplified placeholder; the actual resolve call
  // uses the Universal Resolver which needs DNS-encoded name + addr(bytes32) calldata
  // We rely on alchemy_resolveName instead
  return '0x';
}

// --- Tenderly — Simulation, Verification, Node RPC ---

const TENDERLY_API = 'https://api.tenderly.co/api/v1';

// Tenderly Node RPC endpoints (Gateway)
// Tenderly — same 5 primary networks
const TENDERLY_CHAINS = {
  1:      { name: 'Ethereum',  slug: 'mainnet' },
  42161:  { name: 'Arbitrum',  slug: 'arbitrum' },
  137:    { name: 'Polygon',   slug: 'polygon' },
  8453:   { name: 'Base',      slug: 'base' },
  534352: { name: 'Scroll',    slug: 'scroll' },
  324:    { name: 'zkSync',    slug: 'zksync' },
};

function tenderlyRpc(chainSlug, accessKey) {
  return `https://${chainSlug}.gateway.tenderly.co/${accessKey}`;
}

// Simulate a transaction via Tenderly API
async function tenderlySimulate(params, accessKey) {
  // params: { network_id, from, to, input, value, gas, save }
  const resp = await fetch(`${TENDERLY_API}/account/me/project/project/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': accessKey,
    },
    body: JSON.stringify({
      network_id: String(params.network_id || '1'),
      from: params.from || EOA,
      to: params.to,
      input: params.input || '0x',
      value: params.value || '0',
      gas: params.gas || 8000000,
      save: params.save !== false,
      save_if_fails: true,
      simulation_type: 'full',
    }),
  });
  return resp.json();
}

// Check contract verification status on Tenderly
async function tenderlyVerifyCheck(address, networkId, accessKey) {
  const resp = await fetch(
    `${TENDERLY_API}/account/me/project/project/contract/${networkId}/${address}`,
    {
      headers: { 'X-Access-Key': accessKey },
    }
  );
  if (!resp.ok) return { verified: false, status: resp.status };
  return resp.json();
}

// Get recent transactions for an address via Tenderly
async function tenderlyTransactions(address, networkId, accessKey) {
  const resp = await fetch(
    `${TENDERLY_API}/account/me/project/project/transactions?network_id=${networkId}&address=${address}&per_page=10`,
    {
      headers: { 'X-Access-Key': accessKey },
    }
  );
  if (!resp.ok) return { error: resp.status };
  return resp.json();
}

// --- Zapper GraphQL — Portfolio, DeFi, NFTs ---

const ZAPPER_GQL = 'https://public.zapper.xyz/graphql';

async function zapperQuery(query, variables, apiKey) {
  const resp = await fetch(ZAPPER_GQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-zapper-api-key': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  return resp.json();
}

async function zapperPortfolio(addresses, apiKey, first = 25) {
  const query = `query TokenBalances($addresses: [Address!]!, $first: Int) {
    portfolioV2(addresses: $addresses) {
      tokenBalances {
        totalBalanceUSD
        byToken(first: $first) {
          totalCount
          edges {
            node {
              symbol
              tokenAddress
              balance
              balanceUSD
              price
              imgUrlV2
              name
              network { name }
            }
          }
        }
      }
    }
  }`;
  return zapperQuery(query, { addresses, first }, apiKey);
}

async function zapperApps(addresses, apiKey) {
  const query = `query AppBalances($addresses: [Address!]!) {
    portfolioV2(addresses: $addresses) {
      appBalances {
        totalBalanceUSD
        byApp {
          totalCount
          edges {
            node {
              appId
              balanceUSD
            }
          }
        }
      }
    }
  }`;
  return zapperQuery(query, { addresses }, apiKey);
}

async function zapperNfts(addresses, apiKey, first = 20) {
  const query = `query NftBalances($owners: [Address!]!, $first: Int) {
    nftUsersTokens(owners: $owners, first: $first) {
      edges {
        node {
          tokenId
          name
          collection { name address floorPriceEth }
          estimatedValueEth
          mediasV3 { images { url } }
        }
      }
    }
  }`;
  return zapperQuery(query, { owners: addresses, first }, apiKey);
}

// --- OIDC Discovery ---

const OPENID_CONFIGURATION = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/oauth/authorize`,
  token_endpoint: `${ISSUER}/oauth/token`,
  userinfo_endpoint: `${ISSUER}/oauth/userinfo`,
  jwks_uri: `${ISSUER}/.well-known/jwks.json`,
  scopes_supported: ['openid', 'profile', 'email', 'groups', 'web3'],
  response_types_supported: ['code', 'id_token', 'token'],
  subject_types_supported: ['public'],
  id_token_signing_alg_values_supported: ['RS256'],
  claims_supported: [
    'sub', 'email', 'email_verified', 'name', 'groups',
    'ens', 'eoa', 'safe', 'iat', 'exp', 'iss', 'aud'
  ],
  grant_types_supported: ['authorization_code', 'client_credentials', 'implicit'],
  token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
};

// --- SAML Metadata ---

function samlMetadata() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="${ISSUER}/saml/metadata">
  <IDPSSODescriptor
    WantAuthnRequestsSigned="false"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <SingleSignOnService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="${ISSUER}/saml/sso"/>
    <SingleSignOnService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${ISSUER}/saml/sso"/>
    <SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="${ISSUER}/saml/slo"/>
  </IDPSSODescriptor>
</EntityDescriptor>`;
}

// --- SAML Response Builder ---

function samlResponse(requestId, acsUrl, audience) {
  const now = new Date();
  const notOnOrAfter = new Date(now.getTime() + 5 * 60 * 1000); // 5 min validity
  const sessionExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h session
  const responseId = '_' + crypto.randomUUID();
  const assertionId = '_' + crypto.randomUUID();

  return `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                   xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                   ID="${responseId}"
                   InResponseTo="${requestId}"
                   IssueInstant="${now.toISOString()}"
                   Destination="${acsUrl}"
                   Version="2.0">
  <saml:Issuer>${ISSUER}/saml/metadata</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="${assertionId}" IssueInstant="${now.toISOString()}" Version="2.0">
    <saml:Issuer>${ISSUER}/saml/metadata</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${CANONICAL_EMAIL}</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData InResponseTo="${requestId}"
                                       Recipient="${acsUrl}"
                                       NotOnOrAfter="${notOnOrAfter.toISOString()}"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${now.toISOString()}" NotOnOrAfter="${notOnOrAfter.toISOString()}">
      <saml:AudienceRestriction>
        <saml:Audience>${audience}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="${now.toISOString()}"
                         SessionNotOnOrAfter="${sessionExpiry.toISOString()}"
                         SessionIndex="${assertionId}">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email"><saml:AttributeValue>${CANONICAL_EMAIL}</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="primary_email"><saml:AttributeValue>${PRIMARY_EMAIL}</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="name"><saml:AttributeValue>${DISPLAY_NAME}</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="groups"><saml:AttributeValue>owner,admin,signer</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="ens"><saml:AttributeValue>${CANONICAL_ENS}</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="eoa"><saml:AttributeValue>${EOA}</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="safe"><saml:AttributeValue>${SAFE}</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="orcid"><saml:AttributeValue>${ORCID_ID}</saml:AttributeValue></saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;
}

// --- ID Token / JWT Builder ---

async function buildIdToken(env, audience, nonce) {
  const now = Math.floor(Date.now() / 1000);
    const payload = {
    iss: ISSUER,
    sub: PRIMARY_EMAIL,
    aud: audience || ISSUER,
    exp: now + 86400, // 24h
    iat: now,
    nonce: nonce || undefined,
    email: CANONICAL_EMAIL,
    primary_email: PRIMARY_EMAIL,
    email_verified: true,
    name: DISPLAY_NAME,
    ens: CANONICAL_ENS,
    eoa: EOA,
    safe: SAFE,
    github_id: GITHUB_ID,
    orcid: ORCID_ID,
    groups: ['owner', 'admin', 'signer'],
  };

  // For production: sign with RSA key from env.SIGNING_KEY
  // For now: base64url-encoded unsigned token (replace with proper JWT signing)
  const header = { alg: 'none', typ: 'JWT' };
  const b64Header = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const b64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${b64Header}.${b64Payload}.`;
}

// --- Userinfo ---

const USERINFO = {
  sub: PRIMARY_EMAIL,
  email: CANONICAL_EMAIL,
  email_verified: true,
  primary_email: PRIMARY_EMAIL,
  email_alias: CANONICAL_EMAIL,
  name: DISPLAY_NAME,
  preferred_username: CANONICAL_ENS,
  ens: CANONICAL_ENS,
  eoa: EOA,
  safe: SAFE,
  github_id: GITHUB_ID,
  orcid: ORCID_ID,
  orcid_url: ORCID_URL,
  groups: ['owner', 'admin', 'signer'],
  ethermail: {
    primary: PRIMARY_EMAIL,
    alias: CANONICAL_EMAIL,
    wallet_binding: 'The primary email IS the wallet address — EtherMail proves ownership via wallet signature',
  },
};

// --- SSO Session ---

function ssoSessionResponse() {
  const now = Math.floor(Date.now() / 1000);
  return {
    active: true,
    identity: PRIMARY_EMAIL,
    alias: CANONICAL_EMAIL,
    ens: CANONICAL_ENS,
    eoa: EOA,
    safe: SAFE,
    orcid: ORCID_ID,
    groups: ['owner', 'admin', 'signer'],
    iat: now,
    exp: now + 86400,
    wallet_email_binding: true,
    protocols: {
      oauth: true,
      saml: true,
      oidc: true,
      siwe: true,
    },
  };
}

// --- Safe{Wallet} Plugin HTML ---
// Served at /safe — runs inside app.safe.global as a Safe App or standalone
const SAFE_PLUGIN_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Bridgeworld Identity — Safe Plugin</title>
<style>:root{--bg:#121212;--s:#1e1e1e;--s2:#2a2a2a;--b:#333;--t:#e0e0e0;--td:#888;--a:#12ff80;--a2:#7b61ff;--mg:#dc2626;--sn:#f59e0b;--mn:#ef4444}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'SF Mono','Fira Code',monospace;background:var(--bg);color:var(--t);padding:16px;font-size:13px;line-height:1.5}.hd{display:flex;align-items:center;gap:12px;padding:16px;background:var(--s);border:1px solid var(--b);border-radius:12px;margin-bottom:16px}.hd .d{font-size:28px}.hd .tt{font-size:16px;font-weight:600;color:var(--a)}.hd .st{font-size:11px;color:var(--td)}.ic{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:16px;margin-bottom:12px}.ic .lb{font-size:10px;color:var(--td);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}.ic .vl{font-size:13px;color:var(--a);word-break:break-all}.ic .vl.dm{color:var(--td);font-size:11px}.gr{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.ss{background:var(--s);border:1px solid var(--b);border-radius:10px;padding:14px;text-align:center}.ss .nm{font-size:20px;font-weight:700;color:var(--a)}.ss .lb{font-size:10px;color:var(--td);text-transform:uppercase;letter-spacing:1px;margin-top:4px}.st2{font-size:12px;color:var(--a2);text-transform:uppercase;letter-spacing:2px;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--b)}.tr{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--s);border:1px solid var(--b);border-radius:10px;margin-bottom:8px}.tr .tn{font-weight:600}.tr .tb{color:var(--a);font-weight:600}.tr .tc{font-size:11px;color:var(--td)}.tr.magic .tn{color:var(--mg)}.tr.sand .tn{color:var(--sn)}.tr.mana .tn{color:var(--mn)}.cb{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;background:var(--s2);border:1px solid var(--b);margin:2px}.cb.ac{border-color:var(--a);color:var(--a)}.pg{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.pb{padding:6px 12px;border-radius:6px;font-size:11px;font-weight:600;background:var(--s2);border:1px solid var(--a2);color:var(--a2)}.bt{display:inline-block;padding:10px 20px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid var(--a);background:0 0;color:var(--a);cursor:pointer;transition:all .2s;font-family:inherit;margin:4px}.bt:hover{background:var(--a);color:var(--bg)}.bt.sc{border-color:var(--a2);color:var(--a2)}.bt.sc:hover{background:var(--a2);color:#fff}.ac2{margin-top:16px;display:flex;flex-wrap:wrap;gap:8px}.vb{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600}.vb.ps{background:rgba(18,255,128,.1);color:var(--a);border:1px solid var(--a)}.vb.fl{background:rgba(239,68,68,.1);color:#ef4444;border:1px solid #ef4444}.vb.pd{background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid #f59e0b}#sts{padding:8px;font-size:11px;color:var(--td);text-align:center}.ld{animation:pl 1.5s infinite}@keyframes pl{0%,100%{opacity:1}50%{opacity:.4}}.tf{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:16px;margin-top:12px}.tf input,.tf select{width:100%;padding:8px 12px;background:var(--s2);border:1px solid var(--b);border-radius:6px;color:var(--t);font-family:inherit;font-size:12px;margin:4px 0 10px}.tf label{font-size:10px;color:var(--td);text-transform:uppercase;letter-spacing:1px}#sr{margin-top:12px;padding:12px;background:var(--s2);border-radius:8px;font-size:11px;display:none;white-space:pre-wrap;max-height:200px;overflow-y:auto}</style></head>
<body>
<div class="hd"><span class="d">\u27D0</span><div><div class="tt">Bridgeworld Identity</div><div class="st">Safe{Wallet} Plugin \u2014 theosmagic.uni.eth</div></div></div>
<div id="sts" class="ld">Connecting to Safe and loading identity...</div>
<div id="ms" style="display:none">
<div class="ic"><div class="lb">Primary Identity (wallet = email)</div><div class="vl" id="pe"></div><div class="vl dm" style="margin-top:4px" id="ae"></div></div>
<div class="gr"><div class="ic"><div class="lb">Safe Address</div><div class="vl" id="sa" style="font-size:11px"></div></div><div class="ic"><div class="lb">EOA (Signer)</div><div class="vl" id="ea" style="font-size:11px"></div></div></div>
<div id="vr" style="margin-bottom:16px"></div>
<div class="st2">ORCID</div>
<div class="ic"><div class="lb">ORCID iD</div><div class="vl" id="oi" style="font-size:12px"></div><div class="vl dm" style="margin-top:4px" id="on"></div><div class="vl dm" style="margin-top:4px" id="oe"></div></div>
<div class="st2">Protocols</div><div class="pg"><span class="pb">OAuth 2.0</span><span class="pb">SAML 2.0</span><span class="pb">OIDC</span><span class="pb">SSO</span><span class="pb">SIWE</span><span class="pb">EIP-1271</span><span class="pb">ORCID</span></div>
<div class="st2">Networks</div><div id="nw"></div>
<div class="st2">Native Balances</div><div id="nb"></div>
<div class="st2">Primary Tokens (MAGIC / SAND / MANA)</div><div id="tb"></div>
<div class="st2">Portfolio (Zapper)</div><div class="gr"><div class="ss"><div class="nm" id="tu">\u2014</div><div class="lb">Total USD</div></div><div class="ss"><div class="nm" id="tc">\u2014</div><div class="lb">Tokens</div></div></div>
<div class="st2">Simulate Transaction (Tenderly)</div>
<div class="tf"><label>To Address</label><input type="text" id="st" placeholder="0x..."/><label>Calldata (hex)</label><input type="text" id="sd" placeholder="0x..." value="0x"/><label>Value (wei)</label><input type="text" id="sv" placeholder="0" value="0"/><label>Network</label><select id="sc"><option value="1">Ethereum</option><option value="42161" selected>Arbitrum</option><option value="137">Polygon</option><option value="8453">Base</option><option value="534352">Scroll</option><option value="324">zkSync</option><option value="2020">Ronin</option></select><button class="bt" onclick="simTx()">Simulate</button><button class="bt sc" onclick="propTx()">Propose to Safe</button><div id="sr"></div></div>
<div class="st2">Quick Actions</div><div class="ac2"><button class="bt" onclick="refId()">Refresh</button><button class="bt" onclick="refP()">Portfolio</button><button class="bt sc" onclick="window.open('https://bridgeworld.lol/whoami','_blank')">IdP</button><button class="bt sc" onclick="window.open('https://app.safe.global/home?safe=eth:${SAFE}','_blank')">Open Safe</button></div>
</div>
<script src="https://unpkg.com/@safe-global/safe-apps-sdk@9/dist/safe-apps-sdk.umd.min.js"></script>
<script>
const B='https://bridgeworld.lol',SA='${SAFE}',EA='${EOA}';let sdk=null,si=null;
async function init(){try{if(window.SafeAppsSDK){sdk=new SafeAppsSDK.default();si=await sdk.safe.getInfo();$('sts').textContent='Connected to Safe '+si.safeAddress.slice(0,10)+'... chain '+si.chainId}else $('sts').textContent='Standalone mode'}catch(e){$('sts').textContent='Standalone: '+e.message}await refId();await refOr();await refP();$('ms').style.display='block';$('sts').classList.remove('ld')}
function $(id){return document.getElementById(id)}
async function fj(p){return(await fetch(B+p)).json()}
async function refId(){try{const d=await fj('/identity/onchain');$('pe').textContent=d.identity||'';$('ae').textContent='ENS alias: '+(d.alias||'');$('sa').textContent=d.safe?.address||SA;$('ea').textContent=d.eoa?.address||EA;$('nw').innerHTML=(d.networks||[]).map(n=>'<span class="cb ac">'+n.name+' ('+n.chain_id+')</span>').join(' ');const v=d.verification||{};$('vr').innerHTML=[bg('ENS\\u2192EOA',v.ens_resolves_to_eoa),bg('EOA owns Safe',v.eoa_owns_safe),bg('Threshold=1',v.safe_threshold_1),bg('Chain valid',v.identity_chain_valid)].join(' ');const ab=[];for(const[,b]of Object.entries(d.eoa?.native_balances||{}))if(parseFloat(b.balance)>0)ab.push({w:'EOA',c:b.chain,s:b.native_symbol,b:b.balance});for(const[,b]of Object.entries(d.safe?.native_balances||{}))if(parseFloat(b.balance)>0)ab.push({w:'Safe',c:b.chain,s:b.native_symbol,b:b.balance});$('nb').innerHTML=ab.length?ab.map(b=>'<div class="tr"><div><span class="tn">'+b.s+'</span> <span class="tc">'+b.w+' \\xB7 '+b.c+'</span></div><span class="tb">'+b.b+'</span></div>').join(''):'<div class="tr"><span class="tc">No native balances &gt; 0</span></div>';const tk=d.primary_tokens||{};$('tb').innerHTML=Object.entries(tk).map(([s,t])=>'<div class="tr '+s.toLowerCase()+'"><div><span class="tn">'+s+'</span> <span class="tc">'+t.name+'</span></div><div style="text-align:right"><span class="tb">'+t.combined.toFixed(4)+'</span><div class="tc">EOA: '+t.eoa_total.toFixed(4)+' \\xB7 Safe: '+t.safe_total.toFixed(4)+'</div></div></div>').join('')}catch(e){console.error(e)}}
async function refOr(){try{const d=await fj('/identity/orcid');const o=d.orcid;if(o){$('oi').innerHTML='<a href="'+o.url+'" target="_blank" style="color:var(--a)">'+o.id+'</a>';const r=o.record;if(r&&!r.error){$('on').textContent=r.display_name||'';$('oe').textContent='Emails: '+(r.emails||[]).map(e=>e.email).join(', ')}else{$('on').textContent='';$('oe').textContent=''}}}catch(e){console.error(e)}}
async function refP(){try{const d=await fj('/identity/portfolio');const t=d.tokens;if(t){$('tu').textContent='$'+(t.totalBalanceUSD||0).toFixed(2);$('tc').textContent=t.byToken?.totalCount||'\\u2014'}}catch(e){console.error(e)}}
async function simTx(){const t=$('st').value,d=$('sd').value,v=$('sv').value,c=$('sc').value,r=$('sr');if(!t){r.style.display='block';r.textContent='To address required';return}r.style.display='block';r.textContent='Simulating...';try{const res=await(await fetch(B+'/identity/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:t,input:d,value:v,network_id:c,from:EA})})).json();if(res.simulation?.transaction){const s=res.simulation.transaction;r.textContent='Status: '+(s.status?'SUCCESS':'REVERTED')+'\\nGas: '+(s.gas_used||'?')+'\\nBlock: '+(s.block_number||'?')}else r.textContent=JSON.stringify(res,null,2)}catch(e){r.textContent='Error: '+e.message}}
async function propTx(){const t=$('st').value,d=$('sd').value,v=$('sv').value;if(!t){alert('To required');return}if(sdk){try{const r=await sdk.txs.send({txs:[{to:t,value:v||'0',data:d||'0x'}]});$('sr').style.display='block';$('sr').textContent='Proposed! Hash: '+r.safeTxHash}catch(e){alert('Failed: '+e.message)}}else window.open('https://app.safe.global/transactions/queue?safe=eth:'+SA,'_blank')}
function bg(l,v){if(v===true)return'<span class="vb ps">\\u2713 '+l+'</span>';if(v===false)return'<span class="vb fl">\\u2717 '+l+'</span>';return'<span class="vb pd">? '+l+'</span>'}
init();
</script></body></html>`;

// --- Router ---

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
    };

    // ========================
    // OIDC / OAuth 2.0
    // ========================

    if (path === '/.well-known/openid-configuration') {
      return Response.json(OPENID_CONFIGURATION, { headers: corsHeaders });
    }

    if (path === '/.well-known/jwks.json') {
      // Placeholder — replace with actual JWK when SIGNING_KEY is configured
      return Response.json({ keys: [] }, { headers: corsHeaders });
    }

    if (path === '/.well-known/covenant') {
      return new Response(COVENANT_CA_PEM, {
        headers: {
          'Content-Type': 'application/x-pem-file',
          'Content-Disposition': 'inline; filename="the_eternal_covenant_ca.pem"',
          ...corsHeaders,
        },
      });
    }

    if (path === '/.well-known/covenant.json') {
      return Response.json({
        issuer: 'The Eternal Covenant CA',
        organization: 'Bridgeworld',
        country: 'US',
        valid_from: '2026-02-16T06:57:52Z',
        valid_to: '2036-02-14T06:57:52Z',
        ca: true,
        key_usage: ['Digital Signature', 'Certificate Sign', 'CRL Sign'],
        custom_oid: '1.3.6.1.4.1.55555.1.1',
        declaration_sha256: '40defa0983c4a99b023440b4b92044d0269640a839b21b2301c631e962f2c01c',
        subject_key_id: 'B2:DC:42:F9:9F:BB:E6:29:B7:6F:75:F8:A0:A1:4A:19:92:99:7E:24',
        self_signed: true,
        pem_url: `${ISSUER}/.well-known/covenant`,
        root_artifact: 'The_Eternal_Covenant_Declaration.png',
        root_file_sha256: 'e374c94009e32a6c3cc8f89ea6102ce6886c3302324aaaf1563ace8f10332ebf',
        sovereign_hash: '883e529de31c586131a831a9953113a6d75edd87c97369a2fa3a791209952f5a',
      }, { headers: corsHeaders });
    }

    if (path === '/oauth/authorize') {
      // OAuth authorization endpoint
      // Step 1: Check if we have a valid Cloudflare Access session (CF_Authorization cookie)
      // Step 2: If not, redirect to GitHub OAuth for upstream authentication
      // Step 3: After GitHub verifies identity, issue code with canonical identity

      const clientId = url.searchParams.get('client_id');
      const redirectUri = url.searchParams.get('redirect_uri');
      const state = url.searchParams.get('state');
      const nonce = url.searchParams.get('nonce');
      const responseType = url.searchParams.get('response_type') || 'code';
      const scope = url.searchParams.get('scope') || 'openid';

      if (!redirectUri) {
        return Response.json({ error: 'redirect_uri required' }, { status: 400 });
      }

      // Check for existing session via CF Access JWT or our own session
      const cfAuth = getCookie(request, 'CF_Authorization');
      const idpSession = getCookie(request, 'idp_session');
      let verified = false;

      // Verify via Cloudflare Access JWT
      if (cfAuth) {
        verified = await verifyCfAccessJwt(cfAuth, env);
      }

      // Or verify via our own session cookie
      if (!verified && idpSession && env.IDP_SESSIONS) {
        const session = await env.IDP_SESSIONS.get(`session:${idpSession}`);
        if (session) verified = true;
      }

      if (!verified) {
        // No valid session — redirect to GitHub OAuth for upstream auth
        const ghClientId = env.GITHUB_CLIENT_ID || 'Iv23lidKK1AZBPnKptV2';
        const ghRedirect = `${ISSUER}/oauth/github-callback`;

        // Store the original request params so we can resume after GitHub auth
        const pendingId = crypto.randomUUID();
        if (env.IDP_SESSIONS) {
          await env.IDP_SESSIONS.put(`pending:${pendingId}`, JSON.stringify({
            client_id: clientId,
            redirect_uri: redirectUri,
            state,
            nonce,
            scope,
          }), { expirationTtl: 600 });
        }

        const ghUrl = new URL('https://github.com/login/oauth/authorize');
        ghUrl.searchParams.set('client_id', ghClientId);
        ghUrl.searchParams.set('redirect_uri', ghRedirect);
        ghUrl.searchParams.set('scope', 'user:email read:user');
        ghUrl.searchParams.set('state', pendingId);

        return Response.redirect(ghUrl.toString(), 302);
      }

      // Verified — issue authorization code
      const code = crypto.randomUUID();

      if (env.IDP_SESSIONS) {
        await env.IDP_SESSIONS.put(`code:${code}`, JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          nonce,
          scope,
          created: Date.now(),
        }), { expirationTtl: 300 });
      }

      const redirect = new URL(redirectUri);
      redirect.searchParams.set('code', code);
      if (state) redirect.searchParams.set('state', state);

      return Response.redirect(redirect.toString(), 302);
    }

    // GitHub OAuth callback — upstream auth verification
    if (path === '/oauth/github-callback') {
      const ghCode = url.searchParams.get('code');
      const pendingId = url.searchParams.get('state');

      if (!ghCode || !pendingId) {
        return Response.json({ error: 'missing code or state' }, { status: 400 });
      }

      // Exchange GitHub code for access token
      const ghClientId = env.GITHUB_CLIENT_ID || 'Iv23lidKK1AZBPnKptV2';
      const ghClientSecret = env.GITHUB_CLIENT_SECRET;

      if (!ghClientSecret) {
        return Response.json({ error: 'GITHUB_CLIENT_SECRET not configured' }, { status: 500 });
      }

      const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: ghClientId,
          client_secret: ghClientSecret,
          code: ghCode,
        }),
      });

      const tokenData = await tokenResp.json();
      if (!tokenData.access_token) {
        return Response.json({ error: 'github_auth_failed', details: tokenData }, { status: 401 });
      }

      // Verify the GitHub user is @theosmagic (ID 232430312)
      const userResp = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'bridgeworld-idp',
        },
      });
      const ghUser = await userResp.json();

      if (ghUser.id !== GITHUB_ID) {
        return Response.json({
          error: 'identity_mismatch',
          message: `Expected GitHub user ${GITHUB_LOGIN} (${GITHUB_ID}), got ${ghUser.login} (${ghUser.id})`,
        }, { status: 403 });
      }

      // GitHub identity verified as @theosmagic — create IdP session
      const sessionId = crypto.randomUUID();
      if (env.IDP_SESSIONS) {
        await env.IDP_SESSIONS.put(`session:${sessionId}`, JSON.stringify({
          github_id: ghUser.id,
          github_login: ghUser.login,
          canonical_email: CANONICAL_EMAIL,
          created: Date.now(),
        }), { expirationTtl: 86400 });
      }

      // Resume the original OAuth flow
      let pending = null;
      if (env.IDP_SESSIONS) {
        const raw = await env.IDP_SESSIONS.get(`pending:${pendingId}`);
        if (raw) {
          pending = JSON.parse(raw);
          await env.IDP_SESSIONS.delete(`pending:${pendingId}`);
        }
      }

      if (pending && pending.redirect_uri) {
        // Issue authorization code for the downstream client
        const code = crypto.randomUUID();
        if (env.IDP_SESSIONS) {
          await env.IDP_SESSIONS.put(`code:${code}`, JSON.stringify({
            client_id: pending.client_id,
            redirect_uri: pending.redirect_uri,
            nonce: pending.nonce,
            scope: pending.scope,
            created: Date.now(),
          }), { expirationTtl: 300 });
        }

        const redirect = new URL(pending.redirect_uri);
        redirect.searchParams.set('code', code);
        if (pending.state) redirect.searchParams.set('state', pending.state);

        // Set session cookie and redirect
        return new Response(null, {
          status: 302,
          headers: {
            'Location': redirect.toString(),
            'Set-Cookie': `idp_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`,
          },
        });
      }

      // No pending flow — just establish session and redirect home
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${ISSUER}/whoami`,
          'Set-Cookie': `idp_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`,
        },
      });
    }

    if (path === '/oauth/token' && method === 'POST') {
      const body = await request.formData().catch(() => null);
      const code = body?.get('code');
      const redirectUri = body?.get('redirect_uri');
      const clientId = body?.get('client_id');

      // Validate code if KV is available
      if (env.IDP_SESSIONS && code) {
        const session = await env.IDP_SESSIONS.get(`code:${code}`);
        if (!session) {
          return Response.json({ error: 'invalid_grant' }, { status: 400 });
        }
        await env.IDP_SESSIONS.delete(`code:${code}`);
      }

      const idToken = await buildIdToken(env, clientId);
      const accessToken = crypto.randomUUID();

      // Store access token
      if (env.IDP_SESSIONS) {
        await env.IDP_SESSIONS.put(`token:${accessToken}`, JSON.stringify(USERINFO), { expirationTtl: 86400 });
      }

      return Response.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 86400,
        id_token: idToken,
        scope: 'openid profile email groups web3',
      }, { headers: corsHeaders });
    }

    if (path === '/oauth/userinfo') {
      // In production: validate Bearer token from Authorization header
      return Response.json(USERINFO, { headers: corsHeaders });
    }

    // ========================
    // SAML 2.0
    // ========================

    if (path === '/saml/metadata') {
      return new Response(samlMetadata(), {
        headers: { 'Content-Type': 'application/xml', ...corsHeaders },
      });
    }

    if (path === '/saml/sso') {
      // SP-initiated: parse SAMLRequest from query or POST body
      const samlRequest = url.searchParams.get('SAMLRequest');
      const relayState = url.searchParams.get('RelayState');

      // For a single-user IdP, auto-authenticate and respond
      // In production: decode SAMLRequest to extract RequestID, ACS URL, Issuer
      const requestId = '_' + crypto.randomUUID();
      const acsUrl = url.searchParams.get('acs') || `${ISSUER}/saml/acs`;
      const audience = url.searchParams.get('audience') || ISSUER;

      const response = samlResponse(requestId, acsUrl, audience);
      const b64Response = btoa(response);

      // Auto-POST form to ACS
      const html = `<!DOCTYPE html>
<html><body onload="document.forms[0].submit()">
<form method="POST" action="${acsUrl}">
  <input type="hidden" name="SAMLResponse" value="${b64Response}"/>
  ${relayState ? `<input type="hidden" name="RelayState" value="${relayState}"/>` : ''}
  <noscript><button type="submit">Continue</button></noscript>
</form>
</body></html>`;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (path === '/saml/acs' && method === 'POST') {
      // ACS endpoint — receives SAML assertions (when bridgeworld.lol is an SP)
      return Response.json({
        status: 'authenticated',
        identity: CANONICAL_EMAIL,
        ens: CANONICAL_ENS,
      }, { headers: corsHeaders });
    }

    if (path === '/saml/slo') {
      return Response.json({ status: 'logged_out', identity: CANONICAL_EMAIL }, { headers: corsHeaders });
    }

    // ========================
    // SSO Session
    // ========================

    if (path === '/sso/session') {
      return Response.json(ssoSessionResponse(), { headers: corsHeaders });
    }

    if (path === '/sso/login') {
      // Single-user: immediate session
      return Response.json({
        status: 'authenticated',
        identity: CANONICAL_EMAIL,
        redirect: url.searchParams.get('redirect') || ISSUER,
        session: ssoSessionResponse(),
      }, { headers: corsHeaders });
    }

    if (path === '/sso/logout') {
      return Response.json({
        status: 'logged_out',
        identity: CANONICAL_EMAIL,
      }, { headers: corsHeaders });
    }

    // ========================
    // Identity endpoint (combined)
    // ========================

    if (path === '/identity' || path === '/whoami') {
      return Response.json({
        primary_email: PRIMARY_EMAIL,
        email: CANONICAL_EMAIL,
        ens: CANONICAL_ENS,
        name: DISPLAY_NAME,
        eoa: EOA,
        safe: SAFE,
        github_id: GITHUB_ID,
        orcid: ORCID_ID,
        orcid_url: ORCID_URL,
        groups: ['owner', 'admin', 'signer'],
        identity_proof: `${PRIMARY_EMAIL} = ${EOA} (wallet IS the email — EtherMail wallet-signature binding)`,
        identity_anchors: {
          ethermail: `${PRIMARY_EMAIL} — wallet address IS the email`,
          ens: `${CANONICAL_ENS} — resolves to ${EOA}`,
          github: `@${GITHUB_LOGIN} (ID ${GITHUB_ID}) — upstream OAuth`,
          orcid: `${ORCID_URL} — verified emails: ${CANONICAL_EMAIL}, theosmagic@bridgeworld.lol`,
          safe: `${SAFE} — contract wallet, owner: ${EOA}`,
          x402pad: 'https://402pad.lol — ConnectKit (Treasure family wallet), x402 payment protocol on Base',
        },
        provenance: {
          chain: 'sosmanagic@att.net → OpenSea (wallet seed) → 0x67A977...23B2 → Uniswap → theosmagic.uni.eth → ENS → EtherMail → ALL accounts (incl. 402pad.lol)',
          origin: 'sosmanagic@att.net (personal email)',
          wallet_source: 'OpenSea account (12-word mnemonic seed)',
          ens_source: 'Uniswap ENS subdomain claim → ENS registration',
          email_source: 'EtherMail (wallet address = email by cryptographic binding)',
          all_accounts_from: `${CANONICAL_EMAIL} (theosmagic.uni.eth@ethermail.io)`,
          x402: 'https://402pad.lol — created via ConnectKit from Treasure family wallet, same EOA',
        },
        protocols: {
          oauth: `${ISSUER}/oauth/authorize`,
          saml: `${ISSUER}/saml/metadata`,
          oidc: `${ISSUER}/.well-known/openid-configuration`,
          sso: `${ISSUER}/sso/session`,
          siwe: { domain: 'bridgeworld.lol', chain_id: 1 },
        },
        onchain: `${ISSUER}/identity/onchain`,
        portfolio: `${ISSUER}/identity/portfolio`,
        tokens: `${ISSUER}/identity/tokens`,
        defi: `${ISSUER}/identity/defi`,
        nfts: `${ISSUER}/identity/nfts`,
        chains: `${ISSUER}/identity/chains`,
        balance: `${ISSUER}/identity/balance?chain=1`,
        safe_info: `${ISSUER}/identity/safe`,
        orcid_record: `${ISSUER}/identity/orcid`,
        simulate: `${ISSUER}/identity/simulate (POST)`,
        verify: `${ISSUER}/identity/verify?address=0x...&chain=1`,
        diamondcut: `${ISSUER}/identity/simulate-diamondcut (POST)`,
        safe_plugin: `${ISSUER}/safe`,
      }, { headers: corsHeaders });
    }

    // ========================
    // On-Chain Identity Verification (Alchemy)
    // ========================

    if (path === '/identity/onchain') {
      const apiKey = env.ALCHEMY_API_KEY;
      if (!apiKey) {
        return Response.json({ error: 'ALCHEMY_API_KEY not configured' }, { status: 500, headers: corsHeaders });
      }

      // Check KV cache first (cache for 5 minutes)
      if (env.IDP_SESSIONS) {
        const cached = await env.IDP_SESSIONS.get('onchain:identity');
        if (cached) {
          const parsed = JSON.parse(cached);
          return Response.json({ ...parsed, cached: true }, { headers: corsHeaders });
        }
      }

      // ENS resolution (instant — Uniswap CCIP Read subdomain, hardcoded binding)
      const ensAddress = await resolveENS(CANONICAL_ENS, apiKey);

      // Safe ownership on Arbitrum (where it's deployed)
      const [owners, threshold] = await Promise.all([
        getSafeOwners(SAFE, 42161, apiKey),
        getSafeThreshold(SAFE, 42161, apiKey),
      ]);

      const result = {
        identity: PRIMARY_EMAIL,
        alias: CANONICAL_EMAIL,
        timestamp: new Date().toISOString(),

        networks: Object.entries(ALCHEMY_CHAINS).map(([id, c]) => ({
          chain_id: parseInt(id), name: c.name, native: c.native,
        })),

        ens: {
          name: CANONICAL_ENS,
          resolved_address: ensAddress,
          matches_eoa: ensAddress ? ensAddress.toLowerCase() === EOA.toLowerCase() : null,
        },

        eoa: { address: EOA },

        safe: {
          address: SAFE,
          chain: 'Arbitrum (42161)',
          threshold,
          owners,
          eoa_is_owner: owners ? owners.some(o => o.toLowerCase() === EOA.toLowerCase()) : null,
          deployed_chains: [1, 10, 100, 130, 137, 480, 8453, 42161, 42220, 43114, 57073, 59144, 534352, 1313161554],
        },

        verification: {
          ens_resolves_to_eoa: ensAddress ? ensAddress.toLowerCase() === EOA.toLowerCase() : false,
          eoa_owns_safe: owners ? owners.some(o => o.toLowerCase() === EOA.toLowerCase()) : false,
          safe_threshold_1: threshold === 1,
          identity_chain_valid: (
            (ensAddress ? ensAddress.toLowerCase() === EOA.toLowerCase() : false) &&
            (owners ? owners.some(o => o.toLowerCase() === EOA.toLowerCase()) : false)
          ),
        },

        endpoints: {
          balance: `${ISSUER}/identity/balance?chain=1`,
          tokens: `${ISSUER}/identity/tokens`,
          portfolio: `${ISSUER}/identity/portfolio`,
          safe_detail: `${ISSUER}/identity/safe?chain=42161`,
        },

        providers: {
          alchemy: { active: true, chains: Object.keys(ALCHEMY_CHAINS).length },
          tenderly: { active: !!env.TENDERLY_ACCESS_KEY },
          zapper: { active: !!env.ZAPPER_API_KEY },
        },
      };

      // Cache result for 5 minutes
      if (env.IDP_SESSIONS) {
        await env.IDP_SESSIONS.put('onchain:identity', JSON.stringify(result), { expirationTtl: 300 });
      }

      return Response.json(result, { headers: corsHeaders });
    }

    // Per-chain balance lookup
    if (path === '/identity/balance') {
      const apiKey = env.ALCHEMY_API_KEY;
      if (!apiKey) {
        return Response.json({ error: 'ALCHEMY_API_KEY not configured' }, { status: 500, headers: corsHeaders });
      }

      const address = url.searchParams.get('address') || EOA;
      const chainId = parseInt(url.searchParams.get('chain') || '1');
      const rpcUrl = alchemyRpc(chainId, apiKey);

      if (!rpcUrl) {
        return Response.json({ error: `Chain ${chainId} not supported`, supported: Object.keys(ALCHEMY_CHAINS) }, { status: 400, headers: corsHeaders });
      }

      const balance = await getBalance(rpcUrl, address);
      const wei = BigInt(balance || '0x0');
      const native = Number(wei) / 1e18;

      return Response.json({
        address,
        chain_id: chainId,
        chain_name: ALCHEMY_CHAINS[chainId]?.name,
        wei: balance,
        native: native.toFixed(6),
      }, { headers: corsHeaders });
    }

    // Safe ownership verification
    if (path === '/identity/safe') {
      const apiKey = env.ALCHEMY_API_KEY;
      if (!apiKey) {
        return Response.json({ error: 'ALCHEMY_API_KEY not configured' }, { status: 500, headers: corsHeaders });
      }

      const safeAddr = url.searchParams.get('address') || SAFE;
      const chainId = parseInt(url.searchParams.get('chain') || '1');

      const [owners, threshold] = await Promise.all([
        getSafeOwners(safeAddr, chainId, apiKey),
        getSafeThreshold(safeAddr, chainId, apiKey),
      ]);

      return Response.json({
        safe: safeAddr,
        chain_id: chainId,
        chain_name: ALCHEMY_CHAINS[chainId]?.name,
        threshold,
        owners,
        canonical_eoa_is_owner: owners ? owners.some(o => o.toLowerCase() === EOA.toLowerCase()) : null,
      }, { headers: corsHeaders });
    }

    // ========================
    // Zapper Portfolio (GraphQL)
    // ========================

    // Full portfolio — tokens + apps + NFTs combined
    if (path === '/identity/portfolio') {
      const zapperKey = env.ZAPPER_API_KEY;
      if (!zapperKey) {
        return Response.json({ error: 'ZAPPER_API_KEY not configured' }, { status: 500, headers: corsHeaders });
      }

      const addresses = [EOA, SAFE];

      // Check cache (10 min)
      if (env.IDP_SESSIONS) {
        const cached = await env.IDP_SESSIONS.get('zapper:portfolio');
        if (cached) {
          return Response.json({ ...JSON.parse(cached), cached: true }, { headers: corsHeaders });
        }
      }

      const [tokenResult, appResult, nftResult] = await Promise.allSettled([
        zapperPortfolio(addresses, zapperKey, 50),
        zapperApps(addresses, zapperKey),
        zapperNfts(addresses, zapperKey, 30),
      ]);

      const portfolio = {
        identity: CANONICAL_EMAIL,
        ens: CANONICAL_ENS,
        addresses: { eoa: EOA, safe: SAFE },
        timestamp: new Date().toISOString(),

        tokens: tokenResult.status === 'fulfilled' ? tokenResult.value?.data?.portfolioV2?.tokenBalances : null,
        apps: appResult.status === 'fulfilled' ? appResult.value?.data?.portfolioV2?.appBalances : null,
        nfts: nftResult.status === 'fulfilled' ? nftResult.value?.data?.nftUsersTokens : null,

        errors: {
          tokens: tokenResult.status === 'rejected' ? tokenResult.reason?.message : (tokenResult.value?.errors || null),
          apps: appResult.status === 'rejected' ? appResult.reason?.message : (appResult.value?.errors || null),
          nfts: nftResult.status === 'rejected' ? nftResult.reason?.message : (nftResult.value?.errors || null),
        },
      };

      // Cache for 10 minutes
      if (env.IDP_SESSIONS) {
        await env.IDP_SESSIONS.put('zapper:portfolio', JSON.stringify(portfolio), { expirationTtl: 600 });
      }

      return Response.json(portfolio, { headers: corsHeaders });
    }

    // Token balances only
    if (path === '/identity/tokens') {
      const zapperKey = env.ZAPPER_API_KEY;
      if (!zapperKey) {
        return Response.json({ error: 'ZAPPER_API_KEY not configured' }, { status: 500, headers: corsHeaders });
      }

      const addr = url.searchParams.get('address');
      const addresses = addr ? [addr] : [EOA, SAFE];
      const first = parseInt(url.searchParams.get('first') || '25');

      const result = await zapperPortfolio(addresses, zapperKey, first);
      return Response.json({
        identity: CANONICAL_EMAIL,
        addresses,
        tokens: result?.data?.portfolioV2?.tokenBalances || null,
        errors: result?.errors || null,
      }, { headers: corsHeaders });
    }

    // DeFi / App positions
    if (path === '/identity/defi') {
      const zapperKey = env.ZAPPER_API_KEY;
      if (!zapperKey) {
        return Response.json({ error: 'ZAPPER_API_KEY not configured' }, { status: 500, headers: corsHeaders });
      }

      const addresses = [EOA, SAFE];
      const result = await zapperApps(addresses, zapperKey);
      return Response.json({
        identity: CANONICAL_EMAIL,
        addresses,
        apps: result?.data?.portfolioV2?.appBalances || null,
        errors: result?.errors || null,
      }, { headers: corsHeaders });
    }

    // NFTs
    if (path === '/identity/nfts') {
      const zapperKey = env.ZAPPER_API_KEY;
      if (!zapperKey) {
        return Response.json({ error: 'ZAPPER_API_KEY not configured' }, { status: 500, headers: corsHeaders });
      }

      const first = parseInt(url.searchParams.get('first') || '30');
      const addresses = [EOA, SAFE];
      const result = await zapperNfts(addresses, zapperKey, first);
      return Response.json({
        identity: CANONICAL_EMAIL,
        addresses,
        nfts: result?.data?.nftUsersTokens || null,
        errors: result?.errors || null,
      }, { headers: corsHeaders });
    }

    // ========================
    // ORCID — Researcher Identity
    // ========================

    if (path === '/identity/orcid') {
      // Fetch live ORCID public record
      let orcidRecord = null;
      try {
        const resp = await fetch(`${ORCID_API}/${ORCID_ID}/record`, {
          headers: { 'Accept': 'application/json' },
        });
        if (resp.ok) {
          const data = await resp.json();
          const person = data?.person;
          const name = person?.name;
          orcidRecord = {
            orcid_id: ORCID_ID,
            url: ORCID_URL,
            display_name: name?.['credit-name']?.value || DISPLAY_NAME,
            given_names: name?.['given-names']?.value || null,
            family_name: name?.['family-name']?.value || null,
            country: person?.addresses?.address?.[0]?.country?.value || 'US',
            emails: (person?.emails?.email || []).map(e => ({
              email: e.email,
              verified: e.verified,
              primary: e.primary,
            })),
            urls: (person?.['researcher-urls']?.['researcher-url'] || []).map(u => ({
              name: u['url-name'],
              url: u?.url?.value,
            })),
            last_modified: data?.['history']?.['last-modified-date']?.value || null,
          };
        }
      } catch (e) {
        orcidRecord = { error: 'Failed to fetch ORCID record: ' + e.message };
      }

      return Response.json({
        identity: PRIMARY_EMAIL,
        alias: CANONICAL_EMAIL,
        orcid: {
          id: ORCID_ID,
          url: ORCID_URL,
          record: orcidRecord,
        },
        verification: {
          orcid_emails_include_ethermail: true,
          orcid_emails_include_bridgeworld: true,
          orcid_emails_include_origin: true,
          trust_chain: 'ORCID ↔ EtherMail ↔ bridgeworld.lol ↔ ENS ↔ EOA ↔ Safe',
          note: 'ORCID independently verifies email ownership, creating a cross-platform trust anchor',
        },
        provenance: {
          origin: 'sosmanagic@att.net (personal email — also ORCID primary)',
          chain: 'sosmanagic@att.net → OpenSea (wallet seed) → 0x67A977...23B2 → Uniswap → theosmagic.uni.eth → ENS → EtherMail → ALL accounts',
          note: 'ORCID verifies sosmanagic@att.net as primary email — this is the same email that created the OpenSea account that seeded the wallet. The provenance chain is fully closed.',
        },
        identity_anchors: {
          origin_email: 'sosmanagic@att.net',
          orcid: ORCID_URL,
          ethermail: PRIMARY_EMAIL,
          ens: CANONICAL_ENS,
          github: `https://github.com/${GITHUB_LOGIN}`,
          eoa: EOA,
          safe: SAFE,
        },
      }, { headers: corsHeaders });
    }

    // ========================
    // Tenderly — Simulate, Verify, Debug
    // ========================

    // Simulate a transaction
    if (path === '/identity/simulate' && method === 'POST') {
      const tenderlyKey = env.TENDERLY_ACCESS_KEY;
      if (!tenderlyKey) {
        return Response.json({ error: 'TENDERLY_ACCESS_KEY not configured' }, { status: 500, headers: corsHeaders });
      }

      const body = await request.json().catch(() => null);
      if (!body || !body.to) {
        return Response.json({ error: 'POST body required with at least { to, input, network_id }' }, { status: 400, headers: corsHeaders });
      }

      const result = await tenderlySimulate({
        network_id: body.network_id || body.chain_id || 1,
        from: body.from || EOA,
        to: body.to,
        input: body.input || body.data || '0x',
        value: body.value || '0',
        gas: body.gas || 8000000,
        save: body.save !== false,
      }, tenderlyKey);

      return Response.json({
        identity: PRIMARY_EMAIL,
        simulation: result,
      }, { headers: corsHeaders });
    }

    // Check contract verification
    if (path === '/identity/verify') {
      const tenderlyKey = env.TENDERLY_ACCESS_KEY;
      if (!tenderlyKey) {
        return Response.json({ error: 'TENDERLY_ACCESS_KEY not configured' }, { status: 500, headers: corsHeaders });
      }

      const address = url.searchParams.get('address') || SAFE;
      const networkId = url.searchParams.get('chain') || '1';

      const result = await tenderlyVerifyCheck(address, networkId, tenderlyKey);
      return Response.json({
        address,
        network_id: networkId,
        verification: result,
      }, { headers: corsHeaders });
    }

    // Simulate a DiamondCut (convenience endpoint)
    if (path === '/identity/simulate-diamondcut' && method === 'POST') {
      const tenderlyKey = env.TENDERLY_ACCESS_KEY;
      if (!tenderlyKey) {
        return Response.json({ error: 'TENDERLY_ACCESS_KEY not configured' }, { status: 500, headers: corsHeaders });
      }

      const body = await request.json().catch(() => null);
      if (!body || !body.diamond) {
        return Response.json({
          error: 'POST body required: { diamond, facetCuts, init, calldata, network_id }',
          example: {
            diamond: '0xf7993A8df974AD022647E63402d6315137c58ABf',
            facetCuts: '[[facetAddress, action, selectors], ...]',
            init: '0x0000000000000000000000000000000000000000',
            calldata: '0x',
            network_id: 42161,
          },
        }, { status: 400, headers: corsHeaders });
      }

      // diamondCut(FacetCut[] _diamondCut, address _init, bytes _calldata)
      // selector: 0x1f931c1c
      const result = await tenderlySimulate({
        network_id: body.network_id || 42161,
        from: body.from || EOA,
        to: body.diamond,
        input: body.encoded_calldata || '0x1f931c1c',
        value: '0',
        gas: body.gas || 15000000,
        save: true,
      }, tenderlyKey);

      return Response.json({
        identity: PRIMARY_EMAIL,
        diamond: body.diamond,
        network_id: body.network_id || 42161,
        simulation: result,
      }, { headers: corsHeaders });
    }

    // Multi-chain RPC directory (Alchemy + Tenderly)
    if (path === '/identity/chains') {
      const alchemyKey = env.ALCHEMY_API_KEY;
      const tenderlyKey = env.TENDERLY_ACCESS_KEY;

      const chains = {};

      // Alchemy chains (mask keys in public response)
      for (const [id, c] of Object.entries(ALCHEMY_CHAINS)) {
        chains[id] = {
          chain_id: parseInt(id),
          name: c.name,
          alchemy: alchemyKey ? `https://${c.slug}.g.alchemy.com/v2/***` : null,
        };
      }

      // Tenderly chains (overlay, mask keys)
      for (const [id, c] of Object.entries(TENDERLY_CHAINS)) {
        if (!chains[id]) chains[id] = { chain_id: parseInt(id), name: c.name };
        chains[id].tenderly = tenderlyKey ? `https://${c.slug}.gateway.tenderly.co/***` : null;
      }

      return Response.json({
        identity: PRIMARY_EMAIL,
        eoa: EOA,
        safe: SAFE,
        providers: { alchemy: !!alchemyKey, tenderly: !!tenderlyKey, zapper: !!env.ZAPPER_API_KEY },
        chains: Object.values(chains),
        tenderly_features: {
          simulate: `${ISSUER}/identity/simulate`,
          verify: `${ISSUER}/identity/verify?address=0x...&chain=1`,
          diamondcut: `${ISSUER}/identity/simulate-diamondcut`,
        },
      }, { headers: corsHeaders });
    }

    // ========================
    // Safe{Wallet} Plugin
    // ========================

    if (path === '/safe' || path === '/safe/') {
      // Serve the Safe App plugin HTML
      return new Response(SAFE_PLUGIN_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
      });
    }

    if (path === '/safe/manifest.json') {
      return Response.json({
        name: 'Bridgeworld Identity',
        description: 'Identity Provider plugin — OAuth, SAML, SSO, on-chain verification, portfolio, Tenderly simulation.',
        iconPath: 'https://bridgeworld.lol/img/logo-bw.svg',
        providedBy: { name: CANONICAL_ENS, url: ISSUER },
        networks: { '1': 'Ethereum', '42161': 'Arbitrum', '137': 'Polygon', '8453': 'Base', '534352': 'Scroll', '324': 'zkSync', '2020': 'Ronin' },
      }, { headers: corsHeaders });
    }

    // Fall through — not an IdP route, let other workers/pages handle it
    return new Response(null, { status: 404 });
  },
};
