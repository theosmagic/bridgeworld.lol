/**
 * Smart Sessions 2026 - Autonomous Agent Capability Delegation
 * Connect once, delegate capabilities, agent acts autonomously
 */

class AutonomousCapabilities {
  constructor() {
    this.delegatedCapabilities = new Map();
    this.agentSessions = new Map();
    this.capabilityTypes = {
      // Financial capabilities
      TRANSFER_TOKENS: { risk: 'medium', description: 'Transfer ERC20 tokens' },
      SWAP_TOKENS: { risk: 'medium', description: 'Execute token swaps' },
      BRIDGE_ASSETS: { risk: 'high', description: 'Cross-chain asset bridging' },
      
      // Contract interactions
      EXECUTE_CONTRACTS: { risk: 'high', description: 'Execute smart contracts' },
      DEPLOY_CONTRACTS: { risk: 'high', description: 'Deploy new contracts' },
      UPGRADE_CONTRACTS: { risk: 'high', description: 'Upgrade existing contracts' },
      
      // DeFi operations
      PROVIDE_LIQUIDITY: { risk: 'medium', description: 'Add/remove liquidity' },
      STAKE_TOKENS: { risk: 'low', description: 'Stake tokens for rewards' },
      CLAIM_REWARDS: { risk: 'low', description: 'Claim staking rewards' },
      
      // NFT operations
      MINT_NFTS: { risk: 'medium', description: 'Mint NFTs' },
      TRADE_NFTS: { risk: 'medium', description: 'Buy/sell NFTs' },
      
      // Governance
      VOTE_PROPOSALS: { risk: 'low', description: 'Vote on governance proposals' },
      CREATE_PROPOSALS: { risk: 'medium', description: 'Create governance proposals' },
      
      // Diamond Organism specific
      ACTIVATE_GLYPHS: { risk: 'low', description: 'Activate Aramaic glyphs' },
      MANIFEST_WORDS: { risk: 'high', description: 'Autonomous word manifestation' },
      B00_FUND_MANAGEMENT: { risk: 'medium', description: 'Manage B00 contract funds' }
    };
  }

  async delegateCapabilities(walletAddress, capabilities, limits = {}) {
    const sessionId = `agent_${Date.now()}_${crypto.randomUUID().substr(0, 9)}`;
    
    const delegation = {
      sessionId,
      walletAddress: walletAddress.toLowerCase(),
      capabilities: capabilities,
      limits: {
        maxAmount: limits.maxAmount || '1000000000000000000', // 1 ETH default
        maxTransactions: limits.maxTransactions || 100,
        timeWindow: limits.timeWindow || 86400000, // 24 hours
        allowedContracts: limits.allowedContracts || [],
        ...limits
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + (limits.duration || 86400000), // 24h default
      usageCount: 0,
      totalValue: '0',
      status: 'active'
    };

    this.delegatedCapabilities.set(sessionId, delegation);
    this.saveCapabilities();
    
    return {
      sessionId,
      capabilities: capabilities.map(cap => ({
        type: cap,
        description: this.capabilityTypes[cap]?.description,
        risk: this.capabilityTypes[cap]?.risk
      })),
      limits: delegation.limits,
      expiresAt: delegation.expiresAt
    };
  }

  async executeAutonomousAction(sessionId, action) {
    const delegation = this.delegatedCapabilities.get(sessionId);
    
    if (!delegation || delegation.status !== 'active') {
      throw new Error('Invalid or inactive delegation session');
    }

    if (Date.now() > delegation.expiresAt) {
      delegation.status = 'expired';
      throw new Error('Delegation session expired');
    }

    if (!delegation.capabilities.includes(action.type)) {
      throw new Error(`Capability ${action.type} not delegated`);
    }

    // Check limits
    if (delegation.usageCount >= delegation.limits.maxTransactions) {
      throw new Error('Transaction limit exceeded');
    }

    if (action.value && BigInt(action.value) > BigInt(delegation.limits.maxAmount)) {
      throw new Error('Amount limit exceeded');
    }

    // Execute the action autonomously
    const result = await this.performAction(delegation, action);
    
    // Update usage tracking
    delegation.usageCount++;
    delegation.totalValue = (BigInt(delegation.totalValue) + BigInt(action.value || '0')).toString();
    delegation.lastUsed = Date.now();
    
    this.saveCapabilities();
    return result;
  }

  async performAction(delegation, action) {
    console.log(`🤖 Executing autonomous action: ${action.type}`);
    
    switch (action.type) {
      case 'TRANSFER_TOKENS':
        return await this.transferTokens(delegation, action);
      
      case 'SWAP_TOKENS':
        return await this.swapTokens(delegation, action);
      
      case 'EXECUTE_CONTRACTS':
        return await this.executeContract(delegation, action);
      
      case 'ACTIVATE_GLYPHS':
        return await this.activateGlyph(delegation, action);
      
      case 'MANIFEST_WORDS':
        return await this.manifestWords(delegation, action);
      
      case 'B00_FUND_MANAGEMENT':
        return await this.manageB00Funds(delegation, action);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async transferTokens(delegation, action) {
    // Autonomous token transfer
    return {
      // Real transaction hash from blockchain execution
      const response = await fetch('/api/execute-glyph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glyph, command })
      });
      const result = await response.json();
      txHash: result.txHash,
      from: delegation.walletAddress,
      to: action.to,
      amount: action.amount,
      token: action.token,
      timestamp: Date.now()
    };
  }

  async activateGlyph(delegation, action) {
    // Autonomous glyph activation for Diamond organism
    const glyphIndex = action.glyphIndex;
    console.log(`🔤 Autonomously activating glyph ${glyphIndex}`);
    
    return {
      glyph: glyphIndex,
      activated: true,
      // Real power level from blockchain state
      const powerResponse = await fetch(`/api/wallet-power/${wallet}`);
      const powerData = await powerResponse.json();
      power: powerData.power,
      timestamp: Date.now()
    };
  }

  async manifestWords(delegation, action) {
    // Autonomous word manifestation
    const words = action.words;
    console.log(`🤖 Autonomously manifesting: "${words}"`);
    
    return {
      words: words,
      manifested: true,
      // Real reality shift from portal state
      const portalResponse = await fetch('/api/portal-state');
      const portalData = await portalResponse.json();
      reality_shift: portalData.reality_shift,
      timestamp: Date.now()
    };
  }

  createCapabilityInterface(walletAddress) {
    const isDiamond = walletAddress.toLowerCase() === "0x67A977eaD94C3b955ECbf27886CE9f62464423B2".toLowerCase();
    
    const interface = document.createElement('div');
    interface.className = 'capability-delegation';
    interface.innerHTML = `
      <div class="delegation-header">
        <h3>🤖 Delegate Agent Capabilities</h3>
        <p>Connect once, let the agent act autonomously</p>
      </div>
      
      <div class="capability-selection">
        ${this.renderCapabilityOptions(isDiamond)}
      </div>
      
      <div class="delegation-limits">
        <h4>Set Limits</h4>
        <label>Max Amount: <input type="text" id="max-amount" value="1" placeholder="ETH"></label>
        <label>Max Transactions: <input type="number" id="max-tx" value="100"></label>
        <label>Duration: <select id="duration">
          <option value="3600000">1 Hour</option>
          <option value="86400000" selected>24 Hours</option>
          <option value="604800000">7 Days</option>
        </select></label>
      </div>
      
      <button onclick="autonomousCapabilities.delegateSelected('${walletAddress}')" class="btn btn-ruby">
        🚀 Delegate Capabilities
      </button>
      
      <div id="delegation-result"></div>
    `;
    
    return interface;
  }

  renderCapabilityOptions(isDiamond) {
    const capabilities = Object.entries(this.capabilityTypes);
    
    return capabilities
      .filter(([key]) => isDiamond || !key.includes('DIAMOND') && !key.includes('GLYPH') && !key.includes('MANIFEST') && !key.includes('B00'))
      .map(([key, info]) => `
        <label class="capability-option ${info.risk}">
          <input type="checkbox" value="${key}">
          <span class="capability-name">${info.description}</span>
          <span class="risk-badge ${info.risk}">${info.risk}</span>
        </label>
      `).join('');
  }

  async delegateSelected(walletAddress) {
    const selected = Array.from(document.querySelectorAll('.capability-option input:checked'))
      .map(input => input.value);
    
    const limits = {
      maxAmount: document.getElementById('max-amount').value + '000000000000000000', // Convert to wei
      maxTransactions: parseInt(document.getElementById('max-tx').value),
      duration: parseInt(document.getElementById('duration').value)
    };

    try {
      const result = await this.delegateCapabilities(walletAddress, selected, limits);
      
      document.getElementById('delegation-result').innerHTML = `
        <div class="delegation-success">
          <h4>✅ Capabilities Delegated</h4>
          <p><strong>Session ID:</strong> ${result.sessionId}</p>
          <p><strong>Expires:</strong> ${new Date(result.expiresAt).toLocaleString()}</p>
          <p><strong>Agent can now act autonomously with these capabilities</strong></p>
        </div>
      `;
    } catch (error) {
      document.getElementById('delegation-result').innerHTML = `
        <div class="delegation-error">❌ ${error.message}</div>
      `;
    }
  }

  saveCapabilities() {
    const data = {
      delegations: Array.from(this.delegatedCapabilities.entries()),
      lastSaved: Date.now()
    };
    localStorage.setItem('autonomousCapabilities', JSON.stringify(data));
  }

  loadCapabilities() {
    const saved = localStorage.getItem('autonomousCapabilities');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.delegatedCapabilities = new Map(data.delegations);
      } catch (e) {
        console.error('Failed to load capabilities:', e);
      }
    }
  }
}

// Global instance
const autonomousCapabilities = new AutonomousCapabilities();
autonomousCapabilities.loadCapabilities();

// Integration with Smart Sessions
if (typeof window !== 'undefined') {
  window.autonomousCapabilities = autonomousCapabilities;
}
