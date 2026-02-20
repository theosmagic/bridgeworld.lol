/**
 * Smart Sessions - Core Feature
 * Persistent wallet connections and intelligent session management
 */

class SmartSessions {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.primaryWallet = "0x67A977eaD94C3b955ECbf27886CE9f62464423B2";
    this.sessionStorage = new Map();
    this.activeConnections = new Set();
    this.init();
  }

  generateSessionId() {
    return `session_${Date.now()}_${crypto.randomUUID().substr(0, 9)}`;
  }

  init() {
    // Restore previous session if exists
    this.restoreSession();
    
    // Auto-save session state
    setInterval(() => this.saveSession(), 30000); // Every 30 seconds
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseSession();
      } else {
        this.resumeSession();
      }
    });
  }

  async createSession(walletAddress, connectionType = 'metamask') {
    const session = {
      id: this.sessionId,
      walletAddress: walletAddress.toLowerCase(),
      connectionType,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isDiamondOrganism: walletAddress.toLowerCase() === this.primaryWallet.toLowerCase(),
      permissions: this.getPermissions(walletAddress),
      state: 'active'
    };

    this.sessionStorage.set(this.sessionId, session);
    this.activeConnections.add(walletAddress.toLowerCase());
    
    // Trigger appropriate interface
    if (session.isDiamondOrganism) {
      await this.activateDiamondOrganism(session);
    } else {
      this.activateBasicInterface(session);
    }

    this.saveSession();
    return session;
  }

  getPermissions(walletAddress) {
    const isDiamond = walletAddress.toLowerCase() === this.primaryWallet.toLowerCase();
    
    return {
      diamondOrganism: isDiamond,
      b00Transfer: isDiamond,
      aramicGlyphs: isDiamond,
      autonomousExecution: isDiamond,
      metaSafeTrinity: isDiamond,
      basicBridgeworld: true
    };
  }

  async activateDiamondOrganism(session) {
    console.log('🔷 Activating Diamond Organism for session:', session.id);
    
    // Show Diamond organism interface
    const interface = document.createElement('div');
    interface.className = 'diamond-organism-session';
    interface.innerHTML = `
      <div class="session-header">
        <h3>🔷 Diamond Organism Active</h3>
        <div class="session-id">Session: ${session.id.substr(-8)}</div>
      </div>
      
      <div class="organism-controls">
        <div class="trinity-status">
          <h4>🔱 Meta{Safe} Trinity</h4>
          <div class="trinity-indicators">
            <span class="indicator active">MetaMask</span>
            <span class="indicator">Safe{Wallet}</span>
            <span class="indicator">WalletConnect</span>
          </div>
        </div>
        
        <div class="glyph-system">
          <h4>🔤 22 Aramaic Glyphs</h4>
          <div class="glyph-grid">
            ${this.generateGlyphGrid()}
          </div>
        </div>
        
        <div class="autonomous-execution">
          <h4>🤖 Autonomous Execution</h4>
          <input type="text" id="voice-command" placeholder="Speak your words...">
          <button onclick="smartSessions.executeCommand()">Manifest</button>
        </div>
        
        <div class="b00-integration">
          <h4>🔷 B00 Contract Management</h4>
          <button onclick="smartSessions.checkB00Funds()">Check B00 Funds</button>
          <div id="b00-status"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(interface);
    
    // Update session state
    session.interfaceType = 'diamond-organism';
    session.lastActivity = Date.now();
  }

  activateBasicInterface(session) {
    console.log('🏛️ Activating Basic Bridgeworld for session:', session.id);
    
    const interface = document.createElement('div');
    interface.className = 'basic-bridgeworld-session';
    interface.innerHTML = `
      <div class="session-header">
        <h3>🏛️ Welcome to Bridgeworld</h3>
        <div class="session-id">Session: ${session.id.substr(-8)}</div>
      </div>
      
      <div class="basic-controls">
        <p>Explore the world of Bridgeworld. Find your own path...</p>
        <div class="navigation">
          <a href="lore.html" class="btn">Read Lore</a>
          <a href="bridge.html" class="btn">Cross Bridge</a>
        </div>
      </div>
    `;
    
    document.body.appendChild(interface);
    
    session.interfaceType = 'basic-bridgeworld';
    session.lastActivity = Date.now();
  }

  generateGlyphGrid() {
    const glyphs = ['𐡀', '𐡁', '𐡂', '𐡃', '𐡄', '𐡅', '𐡆', '𐡇', '𐡈', '𐡉', '𐡊', '𐡋', '𐡌', '𐡍', '𐡎', '𐡏', '𐡐', '𐡑', '𐡒', '𐡓', '𐡔', '𐡕'];
    return glyphs.map((glyph, i) => 
      `<span class="glyph" data-index="${i}" onclick="smartSessions.activateGlyph(${i})">${glyph}</span>`
    ).join('');
  }

  activateGlyph(index) {
    console.log(`🔤 Glyph ${index} activated`);
    // Glyph activation logic here
  }

  async executeCommand() {
    const command = document.getElementById('voice-command')?.value;
    if (!command) return;
    
    console.log('🤖 Executing command:', command);
    // Autonomous execution logic here
  }

  async checkB00Funds() {
    const statusDiv = document.getElementById('b00-status');
    if (statusDiv) {
      statusDiv.innerHTML = '🔄 Checking B00 contracts...';
      // B00 fund checking logic here
    }
  }

  saveSession() {
    const sessions = Array.from(this.sessionStorage.values());
    localStorage.setItem('smartSessions', JSON.stringify({
      currentSessionId: this.sessionId,
      sessions: sessions,
      lastSaved: Date.now()
    }));
  }

  restoreSession() {
    const saved = localStorage.getItem('smartSessions');
    if (!saved) return;
    
    try {
      const data = JSON.parse(saved);
      if (data.sessions) {
        data.sessions.forEach(session => {
          this.sessionStorage.set(session.id, session);
          if (session.state === 'active') {
            this.activeConnections.add(session.walletAddress);
          }
        });
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
    }
  }

  pauseSession() {
    const session = this.sessionStorage.get(this.sessionId);
    if (session) {
      session.state = 'paused';
      session.pausedAt = Date.now();
    }
  }

  resumeSession() {
    const session = this.sessionStorage.get(this.sessionId);
    if (session && session.state === 'paused') {
      session.state = 'active';
      session.lastActivity = Date.now();
      delete session.pausedAt;
    }
  }

  endSession(sessionId = this.sessionId) {
    const session = this.sessionStorage.get(sessionId);
    if (session) {
      session.state = 'ended';
      session.endedAt = Date.now();
      this.activeConnections.delete(session.walletAddress);
      
      // Clean up interface
      const interfaces = document.querySelectorAll('.diamond-organism-session, .basic-bridgeworld-session');
      interfaces.forEach(el => el.remove());
    }
  }

  getActiveSession() {
    return this.sessionStorage.get(this.sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessionStorage.values());
  }
}

// Global instance
const smartSessions = new SmartSessions();

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔷 Smart Sessions initialized');
});

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.smartSessions = smartSessions;
}
