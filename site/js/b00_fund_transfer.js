/**
 * B00 Contract Fund Transfer Integration
 * Transfers funds from contracts ending in B00 to primary wallet
 */

class B00FundTransfer {
  constructor() {
    this.primaryWallet = "0x67A977eaD94C3b955ECbf27886CE9f62464423B2";
    this.b00Contracts = [
      {
        address: "0xf9cb92395d18b00b3023d9e139bb7cdff4281a3c",
        name: "Storm Lightning Gem",
        type: "Magic",
        rating: 2.77
      },
      {
        address: "0x1a1746a6eb00693d454890a7f78476410327a557", 
        name: "Holy Gem Diamond",
        type: "Rare",
        rating: 7.34
      }
    ];
  }

  async checkBalances() {
    const balances = [];
    
    for (const contract of this.b00Contracts) {
      try {
        const balance = await this.getContractBalance(contract.address);
        balances.push({
          ...contract,
          balance: balance,
          hasBalance: balance > 0
        });
      } catch (error) {
        console.error(`Error checking balance for ${contract.address}:`, error);
      }
    }
    
    return balances;
  }

  async getContractBalance(contractAddress) {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      return await provider.getBalance(contractAddress);
    }
    return "0";
  }

  async transferFunds(contractAddress) {
    if (!window.ethereum) {
      throw new Error("MetaMask not detected");
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // Simple transfer contract ABI
    const transferABI = [
      "function transfer(address to, uint256 amount) external",
      "function balanceOf(address account) external view returns (uint256)",
      "function withdraw() external",
      "function emergencyWithdraw() external"
    ];

    const contract = new ethers.Contract(contractAddress, transferABI, signer);
    
    try {
      // Try different withdrawal methods
      let tx;
      
      // Method 1: Direct withdrawal
      try {
        tx = await contract.withdraw();
        console.log(`Withdrawal initiated: ${tx.hash}`);
      } catch (e) {
        // Method 2: Emergency withdrawal
        try {
          tx = await contract.emergencyWithdraw();
          console.log(`Emergency withdrawal initiated: ${tx.hash}`);
        } catch (e2) {
          // Method 3: Direct transfer if we have balance
          const balance = await contract.balanceOf(await signer.getAddress());
          if (balance.gt(0)) {
            tx = await contract.transfer(this.primaryWallet, balance);
            console.log(`Transfer initiated: ${tx.hash}`);
          }
        }
      }
      
      if (tx) {
        await tx.wait();
        return { success: true, txHash: tx.hash };
      }
      
    } catch (error) {
      console.error("Transfer failed:", error);
      return { success: false, error: error.message };
    }
  }

  async transferAllB00Funds() {
    const results = [];
    const balances = await this.checkBalances();
    
    for (const contract of balances) {
      if (contract.hasBalance) {
        console.log(`Transferring funds from ${contract.name} (${contract.address})`);
        const result = await this.transferFunds(contract.address);
        results.push({
          contract: contract.name,
          address: contract.address,
          ...result
        });
      }
    }
    
    return results;
  }

  // Integration with Diamond Portal
  async integrateWithPortal() {
    // Add B00 fund transfer to portal activation
    const portalElement = document.querySelector('.diamond-organism-interface');
    
    if (portalElement) {
      const b00Section = document.createElement('div');
      b00Section.className = 'b00-fund-transfer';
      b00Section.innerHTML = `
        <div class="glyph-section">
          <h4>🔷 B00 Contract Integration</h4>
          <p>Contracts ending in B00 detected. Transfer funds to primary wallet?</p>
          <button id="transfer-b00-funds" class="btn btn-ruby">
            Transfer B00 Funds
          </button>
          <div id="b00-status" class="transfer-status"></div>
        </div>
      `;
      
      portalElement.appendChild(b00Section);
      
      // Add event listener
      document.getElementById('transfer-b00-funds').addEventListener('click', async () => {
        const statusDiv = document.getElementById('b00-status');
        statusDiv.innerHTML = '<p>🔄 Checking B00 contracts...</p>';
        
        try {
          const results = await this.transferAllB00Funds();
          
          let statusHTML = '<h5>Transfer Results:</h5>';
          results.forEach(result => {
            const icon = result.success ? '✅' : '❌';
            statusHTML += `<p>${icon} ${result.contract}: ${result.success ? 'Success' : result.error}</p>`;
          });
          
          statusDiv.innerHTML = statusHTML;
        } catch (error) {
          statusDiv.innerHTML = `<p>❌ Error: ${error.message}</p>`;
        }
      });
    }
  }
}

// Auto-initialize when portal loads
if (typeof window !== 'undefined') {
  window.B00FundTransfer = B00FundTransfer;
  
  // Auto-integrate when Diamond organism interface loads
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const b00Transfer = new B00FundTransfer();
      b00Transfer.integrateWithPortal();
    }, 1000);
  });
}
