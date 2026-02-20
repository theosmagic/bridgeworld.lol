/**
 * Meta{Safe} Unified Stack
 * LangChain + Reown + Aramaic Glyphs + Smart Sessions = Always Ready Wallet
 */

class MetaSafeStack {
  constructor() {
    this.wallet = "0x67A977eaD94C3b955ECbf27886CE9f62464423B2";
    this.ens = "theosmagic.uni.eth";
    this.ready = false;
    this.components = {};
    this.init();
  }

  async init() {
    console.log('🔱 Initializing Meta{Safe} Stack...');
    
    // Load all components
    this.components = {
      langChain: new LangChainReownIntegration(),
      sessions: new SmartSessions(),
      execution: new DirectCommandExecution(),
      capabilities: new AutonomousCapabilities()
    };
    
    // Create unified interface
    this.createUnifiedInterface();
    
    this.ready = true;
    console.log('💼 Meta{Safe} ready - wallet in your pocket');
  }

  // Main execution method - your wallet is always ready
  async execute(command) {
    if (!this.ready) {
      throw new Error('Meta{Safe} not ready - daemon not started');
    }

    console.log(`💼 Pulling wallet out of pocket for: "${command}"`);
    
    try {
      // Route through the full stack
      const result = await this.components.langChain.executeCommand(command);
      
      // Log to session
      this.components.sessions.logExecution(command, result);
      
      // Update capabilities usage
      if (result.parsed) {
        this.updateCapabilityUsage(result.parsed.action);
      }
      
      console.log('✅ Command executed - wallet back in pocket');
      return result;
      
    } catch (error) {
      console.error('❌ Execution failed:', error);
      return { error: error.message };
    }
  }

  // Quick access methods - like pulling wallet out for specific actions
  async quickTransfer(to, amount, token = 'ETH') {
    return await this.execute(`transfer ${amount} ${token} to ${to}`);
  }

  async quickSwap(fromToken, toToken, amount) {
    return await this.execute(`swap ${amount} ${fromToken} for ${toToken}`);
  }

  async quickB00Transfer() {
    return await this.execute('transfer all funds from B00 contracts');
  }

  async quickGlyph(glyphName) {
    return await this.execute(`activate ${glyphName} glyph`);
  }

  // Status check - is your wallet ready?
  getStatus() {
    return {
      ready: this.ready,
      wallet: this.wallet,
      ens: this.ens,
      components: Object.keys(this.components),
      message: this.ready ? 
        'Meta{Safe} ready - wallet in pocket' : 
        'Meta{Safe} not ready - start daemon first',
      timestamp: Date.now()
    };
  }

  createUnifiedInterface() {
    const interface = document.createElement('div');
    interface.className = 'meta-safe-unified';
    interface.innerHTML = `
      <div class="meta-safe-header">
        <h2>🔱 Meta{Safe} - Always Ready</h2>
        <div class="wallet-status">
          <span class="wallet-address">${this.wallet}</span>
          <span class="wallet-ens">${this.ens}</span>
          <span class="status-indicator ${this.ready ? 'ready' : 'not-ready'}">
            ${this.ready ? '💼 Ready' : '🏠 Not Ready'}
          </span>
        </div>
      </div>

      <div class="quick-actions">
        <h3>🚀 Quick Actions</h3>
        <div class="action-buttons">
          <button onclick="metaSafe.quickTransfer(prompt('To:'), prompt('Amount:'))" class="btn">
            💸 Quick Transfer
          </button>
          <button onclick="metaSafe.quickB00Transfer()" class="btn">
            🔷 B00 Transfer
          </button>
          <button onclick="metaSafe.quickSwap(prompt('From:'), prompt('To:'), prompt('Amount:'))" class="btn">
            🔄 Quick Swap
          </button>
          <button onclick="metaSafe.quickGlyph(prompt('Glyph:'))" class="btn">
            🔤 Activate Glyph
          </button>
        </div>
      </div>

      <div class="command-interface">
        <h3>🗣️ Natural Language Commands</h3>
        <div class="command-input">
          <textarea id="meta-safe-command" placeholder="Tell Meta{Safe} what to do...
Examples:
- Send 1 ETH to my friend
- Swap all my USDC for ETH  
- Transfer B00 contract funds
- Activate the Taw glyph"></textarea>
          <button onclick="metaSafe.executeFromInterface()" class="btn btn-ruby">
            💼 Execute
          </button>
        </div>
      </div>

      <div class="stack-status">
        <h3>📊 Stack Status</h3>
        <div class="component-status">
          <div class="component">🧠 LangChain: Ready</div>
          <div class="component">🔗 Reown SDK: Ready</div>
          <div class="component">🔤 Aramaic Glyphs: 22 Active</div>
          <div class="component">🧠 Smart Sessions: Active</div>
        </div>
      </div>

      <div class="execution-log">
        <h3>📋 Recent Executions</h3>
        <div id="meta-safe-log"></div>
      </div>
    `;

    document.body.appendChild(interface);
  }

  async executeFromInterface() {
    const command = document.getElementById('meta-safe-command').value;
    if (!command) return;

    const result = await this.execute(command);
    this.displayResult(command, result);
    
    document.getElementById('meta-safe-command').value = '';
  }

  displayResult(command, result) {
    const logDiv = document.getElementById('meta-safe-log');
    if (logDiv) {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `
        <div class="log-time">${new Date().toLocaleTimeString()}</div>
        <div class="log-command">"${command}"</div>
        <div class="log-result ${result.error ? 'error' : 'success'}">
          ${result.error || result.result?.type || 'Executed'}
        </div>
      `;
      logDiv.insertBefore(entry, logDiv.firstChild);
    }
  }

  updateCapabilityUsage(action) {
    // Track capability usage for analytics
    const usage = JSON.parse(localStorage.getItem('metaSafeUsage') || '{}');
    usage[action] = (usage[action] || 0) + 1;
    usage.lastUsed = Date.now();
    localStorage.setItem('metaSafeUsage', JSON.stringify(usage));
  }
}

// Global Meta{Safe} instance
const metaSafe = new MetaSafeStack();

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔱 Meta{Safe} Stack loaded - wallet ready');
});

if (typeof window !== 'undefined') {
  window.metaSafe = metaSafe;
}
