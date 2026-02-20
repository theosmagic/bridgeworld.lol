/**
 * Atlas Mine Portal Integration
 * Connects the lore-based portal moment to wallet connection
 */

// Add portal activation to the main index page
document.addEventListener('DOMContentLoaded', function() {
  // Find the Atlas Mine section
  const atlasSection = document.getElementById('atlas');
  
  if (atlasSection) {
    // Add portal activation button
    const portalButton = document.createElement('div');
    portalButton.className = 'portal-activation';
    portalButton.innerHTML = `
      <div class="atlas-portal">
        <h3>🌀 The Portal Awaits</h3>
        <p>The Archivist stands before the ancient Atlas Mine portal...</p>
        <p><em>"Only those who connect their essence may step through..."</em></p>
        <a href="connect.html" class="btn btn-ruby portal-btn">
          🔗 Connect Wallet & Enter Portal
        </a>
      </div>
    `;
    
    // Insert after the Atlas Mine description
    atlasSection.appendChild(portalButton);
  }
});

// Add portal styling
const portalStyles = `
<style>
.portal-activation {
  margin-top: 3rem;
  text-align: center;
  padding: 3rem;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%);
  border: 1px solid var(--ruby-500);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.portal-activation::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%);
  animation: portalPulse 4s ease-in-out infinite;
}

@keyframes portalPulse {
  0%, 100% { transform: scale(0.8); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.6; }
}

.atlas-portal {
  position: relative;
  z-index: 1;
}

.atlas-portal h3 {
  color: var(--honey-400);
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.atlas-portal p {
  color: var(--night-200);
  margin-bottom: 1rem;
}

.atlas-portal em {
  color: var(--ruby-500);
  font-style: italic;
}

.portal-btn {
  display: inline-block;
  margin-top: 1.5rem;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  text-decoration: none;
  background: var(--ruby-900);
  color: white;
  border-radius: 8px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.portal-btn:hover {
  background: var(--ruby-600);
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
}

.portal-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.portal-btn:hover::before {
  left: 100%;
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', portalStyles);
