// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Nervous System Diamond
 * 
 * This Diamond acts as a neuron in the Diamond nervous system.
 * It can:
 * - Socket gems (facets) from different schools
 * - Receive electrical impulses from other Diamonds
 * - Send electrical impulses to other Diamonds
 * - Process impulses through socketed gems
 * - Act as part of a larger "program tree" nervous system
 * 
 * The "rsync" mechanism: Cross-contract calls between Diamonds
 */

interface INervousSystemDiamond {
    // Gem socketing
    function socketGem(address gemAddress, uint256 socketIndex) external;
    function unsocketGem(uint256 socketIndex) external;
    function getSocketedGems() external view returns (address[] memory);
    
    // Neuron functions - Diamond-to-Diamond communication
    function receiveImpulse(address fromDiamond, uint256 value) external returns (uint256);
    function sendImpulse(address toDiamond, uint256 value) external returns (bool);
    function processThroughGems(uint256 inputValue) external view returns (uint256);
    
    // Nervous system functions
    function connectToDiamond(address diamondAddress) external;
    function disconnectFromDiamond(address diamondAddress) external;
    function getConnectedDiamonds() external view returns (address[] memory);
    function propagateImpulse(address[] memory path, uint256 value) external returns (uint256);
}

contract NervousSystemDiamond is INervousSystemDiamond {
    // Socket system (like PoE)
    address[] private socketedGems;
    mapping(uint256 => address) private sockets; // socketIndex => gemAddress
    uint256 public constant MAX_SOCKETS = 6; // Like PoE
    
    // Nervous system connections (like neurons)
    address[] private connectedDiamonds;
    mapping(address => bool) private isConnected;
    
    // Impulse processing
    mapping(address => uint256) private impulseHistory;
    
    /**
     * @dev Socket a gem into this Diamond
     * Like PoE gem socketing system
     */
    function socketGem(address gemAddress, uint256 socketIndex) external override {
        require(socketIndex < MAX_SOCKETS, "Invalid socket index");
        require(sockets[socketIndex] == address(0), "Socket already occupied");
        
        sockets[socketIndex] = gemAddress;
        socketedGems.push(gemAddress);
    }
    
    /**
     * @dev Unsocket a gem from this Diamond
     */
    function unsocketGem(uint256 socketIndex) external override {
        require(socketIndex < MAX_SOCKETS, "Invalid socket index");
        require(sockets[socketIndex] != address(0), "Socket is empty");
        
        address gemAddress = sockets[socketIndex];
        sockets[socketIndex] = address(0);
        
        // Remove from array
        for (uint256 i = 0; i < socketedGems.length; i++) {
            if (socketedGems[i] == gemAddress) {
                socketedGems[i] = socketedGems[socketedGems.length - 1];
                socketedGems.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Get all socketed gems
     */
    function getSocketedGems() external view override returns (address[] memory) {
        return socketedGems;
    }
    
    /**
     * @dev Receive electrical impulse from another Diamond (neuron)
     * This is the "rsync" mechanism
     */
    function receiveImpulse(address fromDiamond, uint256 value) external override returns (uint256) {
        require(isConnected[fromDiamond] || fromDiamond == address(this), "Not connected");
        
        impulseHistory[fromDiamond] = value;
        
        // Process through socketed gems
        return processThroughGems(value);
    }
    
    /**
     * @dev Send electrical impulse to another Diamond (neuron)
     * This is the "rsync" mechanism
     */
    function sendImpulse(address toDiamond, uint256 value) external override returns (bool) {
        require(isConnected[toDiamond], "Diamond not connected");
        
        // In real implementation, this would call toDiamond.receiveImpulse()
        // For now, return success
        return true;
    }
    
    /**
     * @dev Process impulse through all socketed gems
     * Each gem modifies the value (additive/multiplicative)
     */
    function processThroughGems(uint256 inputValue) public view override returns (uint256) {
        uint256 result = inputValue;
        
        // Process through each socketed gem
        for (uint256 i = 0; i < socketedGems.length; i++) {
            address gemAddress = socketedGems[i];
            if (gemAddress != address(0)) {
                // Call gem's processImpulse function
                // In real implementation, use interface call
                // result = IGem(gemAddress).processImpulse(result);
            }
        }
        
        return result;
    }
    
    /**
     * @dev Connect to another Diamond (neuron connection)
     */
    function connectToDiamond(address diamondAddress) external override {
        require(!isConnected[diamondAddress], "Already connected");
        require(diamondAddress != address(this), "Cannot connect to self");
        
        connectedDiamonds.push(diamondAddress);
        isConnected[diamondAddress] = true;
    }
    
    /**
     * @dev Disconnect from a Diamond
     */
    function disconnectFromDiamond(address diamondAddress) external override {
        require(isConnected[diamondAddress], "Not connected");
        
        isConnected[diamondAddress] = false;
        
        // Remove from array
        for (uint256 i = 0; i < connectedDiamonds.length; i++) {
            if (connectedDiamonds[i] == diamondAddress) {
                connectedDiamonds[i] = connectedDiamonds[connectedDiamonds.length - 1];
                connectedDiamonds.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Get all connected Diamonds
     */
    function getConnectedDiamonds() external view override returns (address[] memory) {
        return connectedDiamonds;
    }
    
    /**
     * @dev Propagate impulse through a path of Diamonds
     * This creates the "program tree" nervous system
     */
    function propagateImpulse(address[] memory path, uint256 value) external override returns (uint256) {
        require(path.length > 0, "Path cannot be empty");
        
        uint256 result = value;
        
        // Process through each Diamond in the path
        for (uint256 i = 0; i < path.length; i++) {
            address diamondAddress = path[i];
            require(isConnected[diamondAddress] || diamondAddress == address(this), "Path contains unconnected Diamond");
            
            // In real implementation, call diamond's receiveImpulse
            // result = INervousSystemDiamond(diamondAddress).receiveImpulse(address(this), result);
        }
        
        return result;
    }
}
