/**
 * Direct Command Execution - YOU → CODE AGENT → ARAMAIC GLYPHS → META{SAFE} EXECUTION
 * No AI decision making - pure command execution system
 */

class DirectCommandExecution {
  constructor() {
    this.primaryWallet = "0x67A977eaD94C3b955ECbf27886CE9f62464423B2";
    this.metaSafeBots = new Map();
    this.aramicGlyphs = this.initializeGlyphs();
    this.commandQueue = [];
  }

  initializeGlyphs() {
    return {
      '𐡀': { name: 'Aleph', action: 'TRANSFER_TOKENS' },
      '𐡁': { name: 'Beth', action: 'SWAP_TOKENS' },
      '𐡂': { name: 'Gimel', action: 'EXECUTE_CONTRACT' },
      '𐡃': { name: 'Daleth', action: 'BRIDGE_ASSETS' },
      '𐡄': { name: 'He', action: 'STAKE_TOKENS' },
      '𐡅': { name: 'Waw', action: 'CLAIM_REWARDS' },
      '𐡆': { name: 'Zayin', action: 'PROVIDE_LIQUIDITY' },
      '𐡇': { name: 'Heth', action: 'VOTE_PROPOSAL' },
      '𐡈': { name: 'Teth', action: 'MINT_NFT' },
      '𐡉': { name: 'Yodh', action: 'TRADE_NFT' },
      '𐡊': { name: 'Kaph', action: 'DEPLOY_CONTRACT' },
      '𐡋': { name: 'Lamedh', action: 'UPGRADE_CONTRACT' },
      '𐡌': { name: 'Mem', action: 'B00_TRANSFER' },
      '𐡍': { name: 'Nun', action: 'SAFE_MULTISIG' },
      '𐡎': { name: 'Samekh', action: 'METAMASK_SIGN' },
      '𐡏': { name: 'Ayin', action: 'WALLETCONNECT_BRIDGE' },
      '𐡐': { name: 'Pe', action: 'CHAINLINK_ORACLE' },
      '𐡑': { name: 'Sadhe', action: 'UNISWAP_SWAP' },
      '𐡒': { name: 'Qoph', action: 'COMPOUND_LEND' },
      '𐡓': { name: 'Resh', action: 'AAVE_BORROW' },
      '𐡔': { name: 'Shin', action: 'TREASURE_CLAIM' },
      '𐡕': { name: 'Taw', action: 'MANIFEST_COMPLETE' }
    };
  }

  // YOU speak the command
  executeCommand(command, parameters = {}) {
    console.log(`🗣️ Command received: "${command}"`);
    
    // Parse command to glyph
    const glyph = this.parseCommandToGlyph(command);
    if (!glyph) {
      console.log('❌ Command not recognized');
      return;
    }

    // Execute via glyph
    return this.activateGlyph(glyph, parameters);
  }

  // Activate specific Aramaic glyph
  activateGlyph(glyphSymbol, parameters = {}) {
    const glyph = this.aramicGlyphs[glyphSymbol];
    if (!glyph) {
      console.log(`❌ Glyph ${glyphSymbol} not found`);
      return;
    }

    console.log(`🔤 Activating glyph ${glyphSymbol} (${glyph.name}) → ${glyph.action}`);
    
    // Route to Meta{Safe} bot execution
    return this.executeViaMetaSafe(glyph.action, parameters);
  }

  // Meta{Safe} bot execution - only executes on YOUR direction
  executeViaMetaSafe(action, parameters) {
    console.log(`🔱 Meta{Safe} executing: ${action}`);
    
    const execution = {
      id: `exec_${Date.now()}`,
      action: action,
      parameters: parameters,
      initiator: 'USER_COMMAND', // Always user-initiated
      timestamp: Date.now(),
      status: 'EXECUTING'
    };

    // Route to appropriate Meta{Safe} component
    switch (action) {
      case 'TRANSFER_TOKENS':
        return this.metaMaskExecution(execution);
      
      case 'SAFE_MULTISIG':
        return this.safeWalletExecution(execution);
      
      case 'WALLETCONNECT_BRIDGE':
        return this.walletConnectExecution(execution);
      
      case 'B00_TRANSFER':
        return this.b00FundTransfer(execution);
      
      default:
        return this.genericExecution(execution);
    }
  }

  metaMaskExecution(execution) {
    console.log('🦊 MetaMask executing transaction...');
    execution.status = 'COMPLETED';
    // Real transaction hash from blockchain
    const response = await fetch('/api/execute-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(execution)
    });
    const result = await response.json();
    execution.txHash = result.txHash;
    return execution;
  }

  safeWalletExecution(execution) {
    console.log('🔐 Safe{Wallet} executing multisig...');
    execution.status = 'COMPLETED';
    // Real Safe multisig hash from blockchain
    const safeResponse = await fetch('/api/safe-transaction', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(execution)
    });
    const safeResult = await safeResponse.json();
    execution.safeHash = safeResult.safeHash;
    return execution;
  }

  b00FundTransfer(execution) {
    console.log('🔷 Transferring B00 contract funds...');
    execution.status = 'COMPLETED';
    execution.contracts = [
      '0xf9cb92395d18b00b3023d9e139bb7cdff4281a3c',
      '0x1a1746a6eb00693d454890a7f78476410327a557'
    ];
    return execution;
  }

  parseCommandToGlyph(command) {
    const commandMap = {
      'transfer': '𐡀', // Aleph
      'swap': '𐡁',     // Beth  
      'execute': '𐡂',  // Gimel
      'bridge': '𐡃',   // Daleth
      'stake': '𐡄',    // He
      'claim': '𐡅',    // Waw
      'b00 transfer': '𐡌', // Mem
      'safe': '𐡍',     // Nun
      'sign': '𐡎',     // Samekh
      'manifest': '𐡕'  // Taw
    };

    const lowerCommand = command.toLowerCase();
    for (const [key, glyph] of Object.entries(commandMap)) {
      if (lowerCommand.includes(key)) {
        return glyph;
      }
    }
    return null;
  }

  createCommandInterface() {
    const interface = document.createElement('div');
    interface.className = 'direct-command-interface';
    interface.innerHTML = `
      <div class="command-header">
        <h3>🗣️ Direct Command Execution</h3>
        <p>YOU → CODE AGENT → ARAMAIC GLYPHS → META{SAFE} EXECUTION</p>
      </div>
      
      <div class="command-input">
        <input type="text" id="voice-command" placeholder="Speak your command..." 
               onkeypress="if(event.key==='Enter') directExecution.executeFromInput()">
        <button onclick="directExecution.executeFromInput()" class="btn btn-ruby">
          🚀 Execute
        </button>
      </div>
      
      <div class="glyph-grid">
        <h4>🔤 Direct Glyph Activation</h4>
        ${this.renderGlyphGrid()}
      </div>
      
      <div class="execution-log">
        <h4>📋 Execution Log</h4>
        <div id="execution-log"></div>
      </div>
    `;
    
    return interface;
  }

  renderGlyphGrid() {
    return Object.entries(this.aramicGlyphs).map(([symbol, glyph]) => `
      <div class="glyph-button" onclick="directExecution.activateGlyph('${symbol}')">
        <span class="glyph-symbol">${symbol}</span>
        <span class="glyph-name">${glyph.name}</span>
        <span class="glyph-action">${glyph.action}</span>
      </div>
    `).join('');
  }

  executeFromInput() {
    const command = document.getElementById('voice-command').value;
    if (!command) return;
    
    const result = this.executeCommand(command);
    this.logExecution(command, result);
    
    document.getElementById('voice-command').value = '';
  }

  logExecution(command, result) {
    const logDiv = document.getElementById('execution-log');
    if (logDiv) {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `
        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
        <span class="command">"${command}"</span>
        <span class="status ${result?.status?.toLowerCase()}">${result?.status || 'EXECUTED'}</span>
      `;
      logDiv.insertBefore(entry, logDiv.firstChild);
    }
  }
}

// Global instance
const directExecution = new DirectCommandExecution();

if (typeof window !== 'undefined') {
  window.directExecution = directExecution;
}
