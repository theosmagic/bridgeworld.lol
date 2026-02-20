/**
 * Autonomous Decision Engine - Rule-Based Transaction Acceptance
 * Agent uses pre-defined rules to decide whether to accept/reject actions
 */

class AutonomousDecisionEngine {
  constructor() {
    this.rules = new Map();
    this.ruleTypes = {
      // Price-based rules
      PRICE_THRESHOLD: 'Only execute if token price is above/below threshold',
      SLIPPAGE_LIMIT: 'Reject if slippage exceeds limit',
      GAS_LIMIT: 'Reject if gas price too high',
      
      // Time-based rules
      TIME_WINDOW: 'Only execute during specific hours',
      COOLDOWN_PERIOD: 'Wait X minutes between similar actions',
      
      // Amount-based rules
      MAX_DAILY_SPEND: 'Daily spending limit across all actions',
      PERCENTAGE_LIMIT: 'Max % of portfolio per transaction',
      
      // Contract-based rules
      WHITELIST_CONTRACTS: 'Only interact with approved contracts',
      BLACKLIST_CONTRACTS: 'Never interact with these contracts',
      
      // Diamond Organism rules
      GLYPH_CONDITIONS: 'Activate glyphs based on conditions',
      MANIFESTATION_RULES: 'Word manifestation approval criteria'
    };
    this.loadRules();
  }

  createRule(name, type, conditions, action = 'ACCEPT') {
    const rule = {
      id: `rule_${Date.now()}_${crypto.randomUUID().substr(0, 6)}`,
      name,
      type,
      conditions,
      action, // ACCEPT, REJECT, REQUIRE_APPROVAL
      createdAt: Date.now(),
      active: true,
      usageCount: 0
    };

    this.rules.set(rule.id, rule);
    this.saveRules();
    return rule;
  }

  async evaluateTransaction(transaction, sessionId) {
    console.log('🤖 Evaluating transaction against rules...');
    
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => rule.active && this.isRuleApplicable(rule, transaction));

    const decisions = [];
    
    for (const rule of applicableRules) {
      const decision = await this.evaluateRule(rule, transaction, sessionId);
      decisions.push(decision);
      rule.usageCount++;
    }

    // Determine final decision
    const finalDecision = this.consolidateDecisions(decisions);
    
    console.log(`🎯 Decision: ${finalDecision.action} (${decisions.length} rules evaluated)`);
    return finalDecision;
  }

  async evaluateRule(rule, transaction, sessionId) {
    const { type, conditions } = rule;
    
    switch (type) {
      case 'PRICE_THRESHOLD':
        return await this.evaluatePriceThreshold(rule, transaction);
      
      case 'SLIPPAGE_LIMIT':
        return this.evaluateSlippageLimit(rule, transaction);
      
      case 'GAS_LIMIT':
        return this.evaluateGasLimit(rule, transaction);
      
      case 'TIME_WINDOW':
        return this.evaluateTimeWindow(rule, transaction);
      
      case 'MAX_DAILY_SPEND':
        return await this.evaluateDailySpend(rule, transaction, sessionId);
      
      case 'WHITELIST_CONTRACTS':
        return this.evaluateContractWhitelist(rule, transaction);
      
      case 'GLYPH_CONDITIONS':
        return this.evaluateGlyphConditions(rule, transaction);
      
      default:
        return { ruleId: rule.id, action: 'ACCEPT', reason: 'No evaluation needed' };
    }
  }

  async evaluatePriceThreshold(rule, transaction) {
    const { token, threshold, operator } = rule.conditions;
    
    // Mock price check (in real implementation, fetch from price oracle)
    const currentPrice = await this.getCurrentPrice(token);
    
    const passes = operator === 'above' ? 
      currentPrice > threshold : 
      currentPrice < threshold;
    
    return {
      ruleId: rule.id,
      action: passes ? 'ACCEPT' : 'REJECT',
      reason: `Price ${currentPrice} is ${operator} threshold ${threshold}`,
      data: { currentPrice, threshold }
    };
  }

  evaluateSlippageLimit(rule, transaction) {
    const maxSlippage = rule.conditions.maxSlippage;
    const expectedSlippage = transaction.slippage || 0;
    
    return {
      ruleId: rule.id,
      action: expectedSlippage <= maxSlippage ? 'ACCEPT' : 'REJECT',
      reason: `Slippage ${expectedSlippage}% vs limit ${maxSlippage}%`
    };
  }

  evaluateGasLimit(rule, transaction) {
    const maxGasPrice = rule.conditions.maxGasPrice;
    const currentGasPrice = transaction.gasPrice || 0;
    
    return {
      ruleId: rule.id,
      action: currentGasPrice <= maxGasPrice ? 'ACCEPT' : 'REJECT',
      reason: `Gas price ${currentGasPrice} vs limit ${maxGasPrice}`
    };
  }

  evaluateTimeWindow(rule, transaction) {
    const { startHour, endHour } = rule.conditions;
    const currentHour = new Date().getHours();
    
    const inWindow = currentHour >= startHour && currentHour <= endHour;
    
    return {
      ruleId: rule.id,
      action: inWindow ? 'ACCEPT' : 'REJECT',
      reason: `Current hour ${currentHour} ${inWindow ? 'within' : 'outside'} window ${startHour}-${endHour}`
    };
  }

  evaluateGlyphConditions(rule, transaction) {
    if (transaction.type !== 'ACTIVATE_GLYPHS') {
      return { ruleId: rule.id, action: 'ACCEPT', reason: 'Not a glyph transaction' };
    }

    const { allowedGlyphs, requiredPower } = rule.conditions;
    const { glyphIndex, currentPower } = transaction;
    
    const glyphAllowed = allowedGlyphs.includes(glyphIndex);
    const powerSufficient = currentPower >= requiredPower;
    
    return {
      ruleId: rule.id,
      action: glyphAllowed && powerSufficient ? 'ACCEPT' : 'REJECT',
      reason: `Glyph ${glyphIndex} allowed: ${glyphAllowed}, power sufficient: ${powerSufficient}`
    };
  }

  consolidateDecisions(decisions) {
    // If any rule says REJECT, reject the transaction
    const rejections = decisions.filter(d => d.action === 'REJECT');
    if (rejections.length > 0) {
      return {
        action: 'REJECT',
        reason: `Rejected by ${rejections.length} rule(s)`,
        details: rejections
      };
    }

    // If any rule requires approval, require approval
    const approvals = decisions.filter(d => d.action === 'REQUIRE_APPROVAL');
    if (approvals.length > 0) {
      return {
        action: 'REQUIRE_APPROVAL',
        reason: `Approval required by ${approvals.length} rule(s)`,
        details: approvals
      };
    }

    // Otherwise accept
    return {
      action: 'ACCEPT',
      reason: `Accepted by all ${decisions.length} applicable rules`,
      details: decisions
    };
  }

  createRuleInterface() {
    const interface = document.createElement('div');
    interface.className = 'rule-builder';
    interface.innerHTML = `
      <div class="rule-header">
        <h3>🎯 Create Decision Rules</h3>
        <p>Define when the agent should accept/reject transactions</p>
      </div>
      
      <div class="rule-form">
        <label>Rule Name: <input type="text" id="rule-name" placeholder="My Trading Rule"></label>
        
        <label>Rule Type: 
          <select id="rule-type">
            <option value="PRICE_THRESHOLD">Price Threshold</option>
            <option value="SLIPPAGE_LIMIT">Slippage Limit</option>
            <option value="GAS_LIMIT">Gas Limit</option>
            <option value="TIME_WINDOW">Time Window</option>
            <option value="MAX_DAILY_SPEND">Daily Spend Limit</option>
            <option value="GLYPH_CONDITIONS">Glyph Conditions</option>
          </select>
        </label>
        
        <div id="rule-conditions">
          <!-- Dynamic conditions based on rule type -->
        </div>
        
        <label>Action: 
          <select id="rule-action">
            <option value="ACCEPT">Accept</option>
            <option value="REJECT">Reject</option>
            <option value="REQUIRE_APPROVAL">Require Approval</option>
          </select>
        </label>
        
        <button onclick="decisionEngine.createRuleFromForm()" class="btn btn-ruby">
          ✅ Create Rule
        </button>
      </div>
      
      <div class="existing-rules">
        <h4>Active Rules</h4>
        <div id="rules-list">${this.renderRulesList()}</div>
      </div>
    `;
    
    return interface;
  }

  renderRulesList() {
    const activeRules = Array.from(this.rules.values()).filter(r => r.active);
    
    return activeRules.map(rule => `
      <div class="rule-item">
        <span class="rule-name">${rule.name}</span>
        <span class="rule-type">${rule.type}</span>
        <span class="rule-usage">Used ${rule.usageCount} times</span>
        <button onclick="decisionEngine.toggleRule('${rule.id}')" class="btn-small">
          ${rule.active ? 'Disable' : 'Enable'}
        </button>
      </div>
    `).join('');
  }

  async getCurrentPrice(token) {
    // Real price feed from CoinGecko API
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`);
      const data = await response.json();
      return data[token]?.usd || 0;
    } catch (error) {
      console.error('Price fetch failed:', error);
      return 0;
    }
  }

  saveRules() {
    const data = {
      rules: Array.from(this.rules.entries()),
      lastSaved: Date.now()
    };
    localStorage.setItem('autonomousRules', JSON.stringify(data));
  }

  loadRules() {
    const saved = localStorage.getItem('autonomousRules');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.rules = new Map(data.rules);
      } catch (e) {
        console.error('Failed to load rules:', e);
      }
    }
  }

  isRuleApplicable(rule, transaction) {
    // Determine if rule applies to this transaction type
    return true; // Simplified - in real implementation, check transaction type vs rule type
  }
}

// Global instance
const decisionEngine = new AutonomousDecisionEngine();

// Integration with autonomous capabilities
if (typeof window !== 'undefined') {
  window.decisionEngine = decisionEngine;
}
