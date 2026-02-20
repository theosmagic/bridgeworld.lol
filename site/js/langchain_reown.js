/**
 * LangChain + Reown SDK Integration
 * LangChain processes commands → Reown SDK executes via wallets
 */

import { LangChain } from 'langchain';
import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

class LangChainReownIntegration {
  constructor() {
    this.primaryWallet = "0x67A977eaD94C3b955ECbf27886CE9f62464423B2";
    this.initializeLangChain();
    this.initializeReown();
  }

  async initializeLangChain() {
    // LangChain for natural language command processing
    this.langChain = new LangChain({
      model: 'gpt-4',
      temperature: 0.1, // Low temperature for precise command parsing
      systemPrompt: `
        You are a blockchain command processor. Parse user commands into structured actions.
        
        Available actions:
        - TRANSFER: Move tokens between addresses
        - SWAP: Exchange tokens via DEX
        - STAKE: Stake tokens for rewards
        - BRIDGE: Cross-chain asset transfer
        - B00_TRANSFER: Transfer funds from B00 contracts
        - GLYPH_ACTIVATE: Activate specific Aramaic glyph
        - SAFE_MULTISIG: Execute Safe wallet transaction
        
        Return JSON: { "action": "ACTION_TYPE", "parameters": {...} }
      `
    });
  }

  async initializeReown() {
    // Reown (WalletConnect) SDK for wallet execution
    const wagmiAdapter = new WagmiAdapter({
      networks: [
        { id: 1, name: 'Ethereum' },
        { id: 137, name: 'Polygon' },
        { id: 42161, name: 'Arbitrum' }
      ],
      projectId: process.env.REOWN_PROJECT_ID || 'your-project-id'
    });

    this.appKit = createAppKit({
      adapters: [wagmiAdapter],
      networks: wagmiAdapter.networks,
      projectId: wagmiAdapter.projectId,
      metadata: {
        name: 'Diamond Organism Portal',
        description: 'Autonomous blockchain execution via Aramaic glyphs',
        url: 'https://bridgeworld.lol',
        icons: ['https://bridgeworld.lol/img/icons/Magic.svg']
      }
    });
  }

  // Main execution pipeline: Command → LangChain → Reown
  async executeCommand(naturalLanguageCommand) {
    console.log(`🗣️ Processing: "${naturalLanguageCommand}"`);
    
    try {
      // Step 1: LangChain processes natural language
      const parsedCommand = await this.parseWithLangChain(naturalLanguageCommand);
      
      // Step 2: Map to Aramaic glyph
      const glyph = this.mapToGlyph(parsedCommand.action);
      
      // Step 3: Execute via Reown SDK
      const result = await this.executeViaReown(parsedCommand, glyph);
      
      return {
        command: naturalLanguageCommand,
        parsed: parsedCommand,
        glyph: glyph,
        result: result
      };
      
    } catch (error) {
      console.error('❌ Execution failed:', error);
      return { error: error.message };
    }
  }

  async parseWithLangChain(command) {
    const response = await this.langChain.call({
      input: command,
      context: {
        walletAddress: this.primaryWallet,
        availableTokens: ['ETH', 'USDC', 'ARB', 'MAGIC'],
        b00Contracts: [
          '0xf9cb92395d18b00b3023d9e139bb7cdff4281a3c',
          '0x1a1746a6eb00693d454890a7f78476410327a557'
        ]
      }
    });

    return JSON.parse(response.text);
  }

  mapToGlyph(action) {
    const glyphMap = {
      'TRANSFER': { symbol: '𐡀', name: 'Aleph' },
      'SWAP': { symbol: '𐡁', name: 'Beth' },
      'STAKE': { symbol: '𐡄', name: 'He' },
      'BRIDGE': { symbol: '𐡃', name: 'Daleth' },
      'B00_TRANSFER': { symbol: '𐡌', name: 'Mem' },
      'SAFE_MULTISIG': { symbol: '𐡍', name: 'Nun' },
      'GLYPH_ACTIVATE': { symbol: '𐡕', name: 'Taw' }
    };

    return glyphMap[action] || { symbol: '𐡕', name: 'Taw' };
  }

  async executeViaReown(parsedCommand, glyph) {
    console.log(`🔤 Activating ${glyph.name} (${glyph.symbol}) via Reown SDK`);
    
    // Connect wallet if not connected
    if (!this.appKit.getAccount()) {
      await this.appKit.open();
      return { status: 'WALLET_CONNECTION_REQUIRED' };
    }

    const { action, parameters } = parsedCommand;
    
    switch (action) {
      case 'TRANSFER':
        return await this.reownTransfer(parameters);
      
      case 'SWAP':
        return await this.reownSwap(parameters);
      
      case 'B00_TRANSFER':
        return await this.reownB00Transfer(parameters);
      
      case 'SAFE_MULTISIG':
        return await this.reownSafeTransaction(parameters);
      
      default:
        return await this.reownGenericTransaction(parameters);
    }
  }

  async reownTransfer(params) {
    const { to, amount, token } = params;
    
    const transaction = {
      to: to,
      value: token === 'ETH' ? amount : '0',
      data: token !== 'ETH' ? this.encodeERC20Transfer(to, amount) : '0x'
    };

    const result = await this.appKit.sendTransaction(transaction);
    return {
      type: 'TRANSFER',
      txHash: result.hash,
      to: to,
      amount: amount,
      token: token
    };
  }

  async reownB00Transfer(params) {
    const b00Contracts = [
      '0xf9cb92395d18b00b3023d9e139bb7cdff4281a3c',
      '0x1a1746a6eb00693d454890a7f78476410327a557'
    ];

    const results = [];
    
    for (const contractAddress of b00Contracts) {
      const transaction = {
        to: contractAddress,
        data: '0x3ccfd60b' // withdraw() function selector
      };
      
      try {
        const result = await this.appKit.sendTransaction(transaction);
        results.push({
          contract: contractAddress,
          txHash: result.hash,
          status: 'SUCCESS'
        });
      } catch (error) {
        results.push({
          contract: contractAddress,
          error: error.message,
          status: 'FAILED'
        });
      }
    }

    return {
      type: 'B00_TRANSFER',
      results: results
    };
  }

  encodeERC20Transfer(to, amount) {
    // ERC20 transfer function selector + parameters
    const selector = '0xa9059cbb';
    const paddedTo = to.slice(2).padStart(64, '0');
    const paddedAmount = amount.toString(16).padStart(64, '0');
    return selector + paddedTo + paddedAmount;
  }

  createInterface() {
    return `
      <div class="langchain-reown-interface">
        <div class="interface-header">
          <h3>🔗 LangChain + Reown Execution</h3>
          <p>Natural language → Blockchain execution</p>
        </div>
        
        <div class="command-input">
          <textarea id="nl-command" placeholder="Describe what you want to do...
Examples:
- Transfer 1 ETH to 0x123...
- Swap 100 USDC for ETH
- Transfer all funds from B00 contracts
- Activate the Aleph glyph"></textarea>
          <button onclick="langChainReown.executeFromInput()" class="btn btn-ruby">
            🚀 Process & Execute
          </button>
        </div>
        
        <div class="execution-pipeline">
          <div class="pipeline-step">
            <span class="step-number">1</span>
            <span class="step-name">LangChain Parse</span>
            <div id="langchain-output"></div>
          </div>
          
          <div class="pipeline-step">
            <span class="step-number">2</span>
            <span class="step-name">Glyph Mapping</span>
            <div id="glyph-output"></div>
          </div>
          
          <div class="pipeline-step">
            <span class="step-number">3</span>
            <span class="step-name">Reown Execution</span>
            <div id="reown-output"></div>
          </div>
        </div>
      </div>
    `;
  }

  async executeFromInput() {
    const command = document.getElementById('nl-command').value;
    if (!command) return;
    
    const result = await this.executeCommand(command);
    this.displayResult(result);
  }

  displayResult(result) {
    if (result.parsed) {
      document.getElementById('langchain-output').innerHTML = 
        `✅ ${result.parsed.action}: ${JSON.stringify(result.parsed.parameters)}`;
    }
    
    if (result.glyph) {
      document.getElementById('glyph-output').innerHTML = 
        `🔤 ${result.glyph.name} (${result.glyph.symbol})`;
    }
    
    if (result.result) {
      document.getElementById('reown-output').innerHTML = 
        `🔗 ${result.result.type}: ${result.result.txHash || 'Executed'}`;
    }
  }
}

// Global instance
const langChainReown = new LangChainReownIntegration();

if (typeof window !== 'undefined') {
  window.langChainReown = langChainReown;
}
