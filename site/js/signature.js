/**
 * Signature helper — personal_sign for "Sign in to Bridgeworld"
 * Same stack as MetaMask SDK + Safe{Wallet} signing (metamask_safe_integration.ts, walletconnect_kit_integration.ts)
 * Used by connect.html after connect via MetaMask SDK / WalletConnect.
 */
(function (global) {
  function message(origin) {
    return 'Sign in to Bridgeworld at ' + (origin || 'bridgeworld.lol');
  }

  /**
   * @param {object} provider - EIP-1193 provider (from MetaMask SDK or WalletConnect)
   * @param {string} address - Account address
   * @returns {Promise<string|null>} - Signature hex or null
   */
  async function signInToBridgeworld(provider, address) {
    if (!provider || !address) return null;
    const msg = message(typeof location !== 'undefined' ? location.origin : '');
    const hexMsg = '0x' + Array.from(new TextEncoder().encode(msg)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    try {
      return await provider.request({ method: 'personal_sign', params: [hexMsg, address] });
    } catch (_) {
      return null;
    }
  }

  global.signInToBridgeworld = signInToBridgeworld;
  global.BridgeworldSignMessage = message;
})(typeof window !== 'undefined' ? window : this);
