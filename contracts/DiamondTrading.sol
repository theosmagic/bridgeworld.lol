// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Diamond Trading Contract
 * 
 * Allows trading of Diamond contracts based on:
 * - Rarity (Common, Magic, Rare, Epic, Legendary)
 * - Community Rating (0-10)
 * - Usage Count
 * - Script Quality
 * 
 * Rarity Colors:
 * - Common: #FFFFFF (White)
 * - Magic: Blue (#4A90E2)
 * - Rare: Yellow/Gold (#FFD700)
 * - Epic: Purple (#9B59B6)
 * - Legendary: Bronze/Gold (#CD7F32)
 */

interface IDiamondTrading {
    struct DiamondListing {
        address diamondAddress;
        address seller;
        uint256 price;
        string rarity;
        uint256 rating;
        uint256 usageCount;
        bool isActive;
    }
    
    function listDiamond(address diamondAddress, uint256 price) external;
    function buyDiamond(uint256 listingId) external payable;
    function updateRating(address diamondAddress, uint256 newRating) external;
    function getDiamondInfo(address diamondAddress) external view returns (
        string memory rarity,
        uint256 rating,
        uint256 usageCount,
        string memory color
    );
}

contract DiamondTrading is IDiamondTrading {
    mapping(address => DiamondListing) public listings;
    mapping(address => uint256) public diamondRatings;
    mapping(address => uint256) public diamondUsage;
    mapping(address => string) public diamondRarity;
    mapping(address => string) public diamondColors;
    
    uint256 public listingCounter;
    DiamondListing[] public allListings;
    
    event DiamondListed(address indexed diamond, address indexed seller, uint256 price, string rarity);
    event DiamondSold(address indexed diamond, address indexed buyer, uint256 price);
    event RatingUpdated(address indexed diamond, uint256 newRating);
    
    /**
     * @dev List a Diamond for trading
     */
    function listDiamond(address diamondAddress, uint256 price) external override {
        require(price > 0, "Price must be greater than 0");
        require(!listings[diamondAddress].isActive, "Diamond already listed");
        
        listings[diamondAddress] = DiamondListing({
            diamondAddress: diamondAddress,
            seller: msg.sender,
            price: price,
            rarity: diamondRarity[diamondAddress],
            rating: diamondRatings[diamondAddress],
            usageCount: diamondUsage[diamondAddress],
            isActive: true
        });
        
        allListings.push(listings[diamondAddress]);
        listingCounter++;
        
        emit DiamondListed(diamondAddress, msg.sender, price, diamondRarity[diamondAddress]);
    }
    
    /**
     * @dev Buy a listed Diamond
     */
    function buyDiamond(uint256 listingId) external payable override {
        require(listingId < allListings.length, "Invalid listing");
        DiamondListing storage listing = allListings[listingId];
        
        require(listing.isActive, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");
        
        listing.isActive = false;
        
        // Transfer payment to seller
        payable(listing.seller).transfer(listing.price);
        
        // Refund excess
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
        
        emit DiamondSold(listing.diamondAddress, msg.sender, listing.price);
    }
    
    /**
     * @dev Update community rating for a Diamond
     */
    function updateRating(address diamondAddress, uint256 newRating) external override {
        require(newRating <= 10, "Rating must be <= 10");
        
        diamondRatings[diamondAddress] = newRating;
        
        // Recalculate rarity based on new rating
        uint256 usage = diamondUsage[diamondAddress];
        uint256 quality = newRating; // Simplified: quality = rating
        
        // Calculate rarity
        string memory rarity = calculateRarity(newRating, usage, quality);
        diamondRarity[diamondAddress] = rarity;
        diamondColors[diamondAddress] = getRarityColor(rarity);
        
        emit RatingUpdated(diamondAddress, newRating);
    }
    
    /**
     * @dev Get Diamond information
     */
    function getDiamondInfo(address diamondAddress) external view override returns (
        string memory rarity,
        uint256 rating,
        uint256 usageCount,
        string memory color
    ) {
        return (
            diamondRarity[diamondAddress],
            diamondRatings[diamondAddress],
            diamondUsage[diamondAddress],
            diamondColors[diamondAddress]
        );
    }
    
    /**
     * @dev Calculate rarity based on metrics
     */
    function calculateRarity(uint256 rating, uint256 usage, uint256 quality) internal pure returns (string memory) {
        uint256 normalizedUsage = usage > 1000 ? 10 : (usage * 10) / 1000;
        uint256 combinedScore = (rating * 40 + normalizedUsage * 30 + quality * 30) / 100;
        
        if (combinedScore >= 95) return "Legendary";
        if (combinedScore >= 75) return "Epic";
        if (combinedScore >= 50) return "Rare";
        if (combinedScore >= 25) return "Magic";
        return "Common";
    }
    
    /**
     * @dev Get color for rarity
     */
    function getRarityColor(string memory rarity) internal pure returns (string memory) {
        bytes memory rarityBytes = bytes(rarity);
        if (keccak256(rarityBytes) == keccak256(bytes("Legendary"))) return "#CD7F32";
        if (keccak256(rarityBytes) == keccak256(bytes("Epic"))) return "#9B59B6";
        if (keccak256(rarityBytes) == keccak256(bytes("Rare"))) return "#FFD700";
        if (keccak256(rarityBytes) == keccak256(bytes("Magic"))) return "#4A90E2";
        return "#FFFFFF";
    }
}
