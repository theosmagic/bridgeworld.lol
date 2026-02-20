// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TreasureIntegrationFacet
 * @notice Diamond facet integrating TreasureProject ecosystem components
 * @dev Merged from: spellcaster-facets, magicswapv2, treasure-marketplace
 * 
 * Integrated Components:
 * - Spellcaster GM (Game Master)
 * - Guild Management System
 * - Simple Crafting System
 * - Payments V2 (ERC20 + Gas Token)
 * - MagicSwap V2 Router
 * - NFT Vault System
 * - Organization Management
 * - Meta Transactions (Gasless)
 */

// ============ INTERFACES ============

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC1155 {
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

interface IChainlinkAggregator {
    function latestRoundData() external view returns (
        uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
    );
}

interface INftVault {
    enum NftType { ERC721, ERC1155 }
    struct CollectionData {
        NftType nftType;
        address collection;
        bool allowed;
    }
    function depositBatch(address to, address[] calldata collections, uint256[] calldata tokenIds, uint256[] calldata amounts) external returns (uint256);
    function withdrawBatch(address to, address[] calldata collections, uint256[] calldata tokenIds, uint256[] calldata amounts) external returns (uint256);
    function getAllowedCollectionData(address collection) external view returns (CollectionData memory);
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory);
    function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256, uint256, uint256);
}

interface IMagicSwapV2Router {
    struct NftVaultLiquidityData {
        INftVault token;
        address[] collection;
        uint256[] tokenId;
        uint256[] amount;
    }
    function depositVault(address[] memory collection, uint256[] memory tokenId, uint256[] memory amount, INftVault vault, address to) external returns (uint256);
    function withdrawVault(address[] memory collection, uint256[] memory tokenId, uint256[] memory amount, INftVault vault, address to) external returns (uint256);
    function swapNftForTokens(address[] memory collection, uint256[] memory tokenId, uint256[] memory amount, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory);
}

// ============ STORAGE ============

library TreasureStorage {
    bytes32 constant TREASURE_STORAGE_POSITION = keccak256("diamond.treasure.storage");
    
    enum TokenType { ERC20, ERC721, ERC1155 }
    enum GuildStatus { ACTIVE, TERMINATED }
    enum GuildUserStatus { NOT_ASSOCIATED, INVITED, MEMBER, ADMIN, OWNER }
    
    struct Ingredient {
        TokenType tokenType;
        address tokenAddress;
        uint256 tokenId;
        uint256 tokenQuantity;
    }
    
    struct CraftingResult {
        address target;
        bytes4 selector;
        bytes params;
    }
    
    struct CraftingRecipe {
        Ingredient[] ingredients;
        CraftingResult[] results;
    }
    
    struct GuildInfo {
        string name;
        string description;
        address currentOwner;
        GuildStatus status;
        uint32 memberCount;
        string symbolImageData;
        bool isSymbolOnChain;
    }
    
    struct GuildUserInfo {
        GuildUserStatus userStatus;
        uint8 memberLevel;
        uint64 timeJoined;
    }
    
    struct OrganizationInfo {
        string name;
        string description;
        address admin;
        bool active;
        uint32 guildCount;
        address guildTokenAddress;
    }
    
    struct State {
        // Spellcaster GM
        mapping(address => bool) trustedSigners;
        
        // Crafting
        uint256 currentRecipeId;
        mapping(uint256 => CraftingRecipe) craftingRecipes;
        mapping(address => mapping(uint256 => bool)) collectionRecipeAllowed;
        
        // Guilds
        mapping(bytes32 => OrganizationInfo) organizations;
        mapping(bytes32 => mapping(uint32 => GuildInfo)) guilds;
        mapping(bytes32 => mapping(uint32 => mapping(address => GuildUserInfo))) guildUsers;
        mapping(bytes32 => uint32) guildIdCounter;
        
        // Payments
        address gasTokenUSDPriceFeed;
        address magicTokenAddress;
        mapping(address => address) tokenPriceFeeds;
        
        // MagicSwap
        address magicSwapRouter;
        address magicSwapFactory;
        mapping(address => bool) allowedVaults;
        
        // Meta Transactions
        mapping(address => uint256) nonces;
    }
    
    function getState() internal pure returns (State storage state) {
        bytes32 position = TREASURE_STORAGE_POSITION;
        assembly { state.slot := position }
    }
}

// ============ MAIN CONTRACT ============

contract TreasureIntegrationFacet {
    using TreasureStorage for TreasureStorage.State;
    
    // ============ EVENTS ============
    
    event TrustedSignerSet(address indexed signer, bool trusted);
    event CraftingRecipeCreated(uint256 indexed recipeId, address indexed creator);
    event CraftingRecipeCrafted(uint256 indexed recipeId, address indexed crafter);
    event GuildCreated(bytes32 indexed organizationId, uint32 indexed guildId, address indexed owner);
    event GuildTerminated(bytes32 indexed organizationId, uint32 indexed guildId, string reason);
    event GuildMemberJoined(bytes32 indexed organizationId, uint32 indexed guildId, address indexed member);
    event GuildMemberLeft(bytes32 indexed organizationId, uint32 indexed guildId, address indexed member);
    event OrganizationCreated(bytes32 indexed organizationId, string name, address admin);
    event PaymentReceived(address indexed payer, address indexed token, uint256 amount, uint256 usdValue);
    event VaultDeposit(address indexed vault, address indexed depositor, uint256 amountMinted);
    event VaultWithdraw(address indexed vault, address indexed withdrawer, uint256 amountBurned);
    event NFTSwapped(address indexed user, address indexed vaultIn, address indexed tokenOut, uint256 amountOut);
    
    // ============ ERRORS ============
    
    error NotTrustedSigner();
    error RecipeNotAllowed(uint256 recipeId);
    error InvalidOrganization(bytes32 organizationId);
    error InvalidGuild(bytes32 organizationId, uint32 guildId);
    error NotGuildOwner();
    error NotGuildAdmin();
    error AlreadyMember();
    error NotInvited();
    error InsufficientPayment();
    error VaultNotAllowed(address vault);
    error InvalidSignature();
    
    // ============ MODIFIERS ============
    
    modifier onlyTrustedSigner() {
        if (!TreasureStorage.getState().trustedSigners[msg.sender]) revert NotTrustedSigner();
        _;
    }
    
    modifier validOrganization(bytes32 organizationId) {
        if (!TreasureStorage.getState().organizations[organizationId].active) revert InvalidOrganization(organizationId);
        _;
    }
    
    modifier validGuild(bytes32 organizationId, uint32 guildId) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        if (state.guilds[organizationId][guildId].status != TreasureStorage.GuildStatus.ACTIVE) {
            revert InvalidGuild(organizationId, guildId);
        }
        _;
    }
    
    // ============ INITIALIZATION ============
    
    function TreasureIntegration_init(
        address _gasTokenPriceFeed,
        address _magicToken,
        address _magicSwapRouter,
        address _magicSwapFactory
    ) external {
        TreasureStorage.State storage state = TreasureStorage.getState();
        state.gasTokenUSDPriceFeed = _gasTokenPriceFeed;
        state.magicTokenAddress = _magicToken;
        state.magicSwapRouter = _magicSwapRouter;
        state.magicSwapFactory = _magicSwapFactory;
    }
    
    // ============ SPELLCASTER GM ============
    
    function setTrustedSigner(address _signer, bool _trusted) external {
        TreasureStorage.getState().trustedSigners[_signer] = _trusted;
        emit TrustedSignerSet(_signer, _trusted);
    }
    
    function isTrustedSigner(address _signer) external view returns (bool) {
        return TreasureStorage.getState().trustedSigners[_signer];
    }
    
    // ============ CRAFTING SYSTEM ============
    
    function createCraftingRecipe(
        TreasureStorage.Ingredient[] calldata _ingredients,
        TreasureStorage.CraftingResult[] calldata _results
    ) external returns (uint256 recipeId) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        recipeId = state.currentRecipeId++;
        
        TreasureStorage.CraftingRecipe storage recipe = state.craftingRecipes[recipeId];
        
        for (uint256 i = 0; i < _ingredients.length; i++) {
            recipe.ingredients.push(_ingredients[i]);
        }
        
        for (uint256 i = 0; i < _results.length; i++) {
            recipe.results.push(_results[i]);
        }
        
        emit CraftingRecipeCreated(recipeId, msg.sender);
    }
    
    function allowRecipeForCollection(address _collection, uint256 _recipeId, bool _allowed) external {
        TreasureStorage.getState().collectionRecipeAllowed[_collection][_recipeId] = _allowed;
    }
    
    function craft(uint256 _recipeId) external {
        TreasureStorage.State storage state = TreasureStorage.getState();
        TreasureStorage.CraftingRecipe storage recipe = state.craftingRecipes[_recipeId];
        
        // Pull ingredients
        for (uint256 i = 0; i < recipe.ingredients.length; i++) {
            TreasureStorage.Ingredient storage ingredient = recipe.ingredients[i];
            
            if (ingredient.tokenType == TreasureStorage.TokenType.ERC20) {
                IERC20(ingredient.tokenAddress).transferFrom(msg.sender, address(this), ingredient.tokenQuantity);
            } else if (ingredient.tokenType == TreasureStorage.TokenType.ERC721) {
                IERC721(ingredient.tokenAddress).safeTransferFrom(msg.sender, address(this), ingredient.tokenId);
            } else if (ingredient.tokenType == TreasureStorage.TokenType.ERC1155) {
                IERC1155(ingredient.tokenAddress).safeTransferFrom(msg.sender, address(this), ingredient.tokenId, ingredient.tokenQuantity, "");
            }
        }
        
        // Execute results
        for (uint256 i = 0; i < recipe.results.length; i++) {
            TreasureStorage.CraftingResult storage result = recipe.results[i];
            
            if (!state.collectionRecipeAllowed[result.target][_recipeId]) {
                revert RecipeNotAllowed(_recipeId);
            }
            
            (bool success,) = result.target.call(abi.encodePacked(result.selector, abi.encode(msg.sender), result.params));
            require(success, "Crafting result failed");
        }
        
        emit CraftingRecipeCrafted(_recipeId, msg.sender);
    }
    
    function getCraftingRecipe(uint256 _recipeId) external view returns (
        TreasureStorage.Ingredient[] memory ingredients,
        TreasureStorage.CraftingResult[] memory results
    ) {
        TreasureStorage.CraftingRecipe storage recipe = TreasureStorage.getState().craftingRecipes[_recipeId];
        return (recipe.ingredients, recipe.results);
    }
    
    // ============ ORGANIZATION MANAGEMENT ============
    
    function createOrganization(
        bytes32 _organizationId,
        string calldata _name,
        string calldata _description
    ) external {
        TreasureStorage.State storage state = TreasureStorage.getState();
        require(!state.organizations[_organizationId].active, "Organization exists");
        
        state.organizations[_organizationId] = TreasureStorage.OrganizationInfo({
            name: _name,
            description: _description,
            admin: msg.sender,
            active: true,
            guildCount: 0,
            guildTokenAddress: address(0)
        });
        
        emit OrganizationCreated(_organizationId, _name, msg.sender);
    }
    
    function getOrganization(bytes32 _organizationId) external view returns (TreasureStorage.OrganizationInfo memory) {
        return TreasureStorage.getState().organizations[_organizationId];
    }
    
    // ============ GUILD MANAGEMENT ============
    
    function createGuild(
        bytes32 _organizationId,
        string calldata _name,
        string calldata _description
    ) external validOrganization(_organizationId) returns (uint32 guildId) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        
        guildId = ++state.guildIdCounter[_organizationId];
        state.organizations[_organizationId].guildCount++;
        
        state.guilds[_organizationId][guildId] = TreasureStorage.GuildInfo({
            name: _name,
            description: _description,
            currentOwner: msg.sender,
            status: TreasureStorage.GuildStatus.ACTIVE,
            memberCount: 1,
            symbolImageData: "",
            isSymbolOnChain: false
        });
        
        state.guildUsers[_organizationId][guildId][msg.sender] = TreasureStorage.GuildUserInfo({
            userStatus: TreasureStorage.GuildUserStatus.OWNER,
            memberLevel: 255,
            timeJoined: uint64(block.timestamp)
        });
        
        emit GuildCreated(_organizationId, guildId, msg.sender);
    }
    
    function terminateGuild(
        bytes32 _organizationId,
        uint32 _guildId,
        string calldata _reason
    ) external validGuild(_organizationId, _guildId) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        
        if (state.guilds[_organizationId][_guildId].currentOwner != msg.sender) {
            revert NotGuildOwner();
        }
        
        state.guilds[_organizationId][_guildId].status = TreasureStorage.GuildStatus.TERMINATED;
        state.organizations[_organizationId].guildCount--;
        
        emit GuildTerminated(_organizationId, _guildId, _reason);
    }
    
    function inviteToGuild(
        bytes32 _organizationId,
        uint32 _guildId,
        address[] calldata _users
    ) external validGuild(_organizationId, _guildId) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        TreasureStorage.GuildUserInfo storage senderInfo = state.guildUsers[_organizationId][_guildId][msg.sender];
        
        if (senderInfo.userStatus != TreasureStorage.GuildUserStatus.OWNER && 
            senderInfo.userStatus != TreasureStorage.GuildUserStatus.ADMIN) {
            revert NotGuildAdmin();
        }
        
        for (uint256 i = 0; i < _users.length; i++) {
            state.guildUsers[_organizationId][_guildId][_users[i]].userStatus = TreasureStorage.GuildUserStatus.INVITED;
        }
    }
    
    function acceptGuildInvitation(
        bytes32 _organizationId,
        uint32 _guildId
    ) external validGuild(_organizationId, _guildId) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        TreasureStorage.GuildUserInfo storage userInfo = state.guildUsers[_organizationId][_guildId][msg.sender];
        
        if (userInfo.userStatus != TreasureStorage.GuildUserStatus.INVITED) {
            revert NotInvited();
        }
        
        userInfo.userStatus = TreasureStorage.GuildUserStatus.MEMBER;
        userInfo.timeJoined = uint64(block.timestamp);
        state.guilds[_organizationId][_guildId].memberCount++;
        
        emit GuildMemberJoined(_organizationId, _guildId, msg.sender);
    }
    
    function leaveGuild(
        bytes32 _organizationId,
        uint32 _guildId
    ) external validGuild(_organizationId, _guildId) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        TreasureStorage.GuildUserInfo storage userInfo = state.guildUsers[_organizationId][_guildId][msg.sender];
        
        if (userInfo.userStatus == TreasureStorage.GuildUserStatus.OWNER) {
            revert NotGuildOwner(); // Owners must transfer ownership first
        }
        
        userInfo.userStatus = TreasureStorage.GuildUserStatus.NOT_ASSOCIATED;
        state.guilds[_organizationId][_guildId].memberCount--;
        
        emit GuildMemberLeft(_organizationId, _guildId, msg.sender);
    }
    
    function getGuildInfo(
        bytes32 _organizationId,
        uint32 _guildId
    ) external view returns (TreasureStorage.GuildInfo memory) {
        return TreasureStorage.getState().guilds[_organizationId][_guildId];
    }
    
    function getGuildMemberInfo(
        bytes32 _organizationId,
        uint32 _guildId,
        address _user
    ) external view returns (TreasureStorage.GuildUserInfo memory) {
        return TreasureStorage.getState().guildUsers[_organizationId][_guildId][_user];
    }
    
    // ============ PAYMENTS ============
    
    function setTokenPriceFeed(address _token, address _priceFeed) external {
        TreasureStorage.getState().tokenPriceFeeds[_token] = _priceFeed;
    }
    
    function getTokenPriceUSD(address _token) public view returns (uint256) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        address priceFeed = state.tokenPriceFeeds[_token];
        
        if (priceFeed == address(0)) {
            priceFeed = state.gasTokenUSDPriceFeed;
        }
        
        (, int256 price,,,) = IChainlinkAggregator(priceFeed).latestRoundData();
        return uint256(price);
    }
    
    function payInToken(
        address _token,
        uint256 _amount,
        address _recipient
    ) external {
        IERC20(_token).transferFrom(msg.sender, _recipient, _amount);
        
        uint256 usdValue = (_amount * getTokenPriceUSD(_token)) / 1e8;
        emit PaymentReceived(msg.sender, _token, _amount, usdValue);
    }
    
    function payInGasToken(address _recipient) external payable {
        (bool success,) = _recipient.call{value: msg.value}("");
        require(success, "Transfer failed");
        
        uint256 usdValue = (msg.value * getTokenPriceUSD(address(0))) / 1e8;
        emit PaymentReceived(msg.sender, address(0), msg.value, usdValue);
    }
    
    // ============ MAGICSWAP V2 ============
    
    function setAllowedVault(address _vault, bool _allowed) external {
        TreasureStorage.getState().allowedVaults[_vault] = _allowed;
    }
    
    function depositToVault(
        address[] calldata _collections,
        uint256[] calldata _tokenIds,
        uint256[] calldata _amounts,
        address _vault
    ) external returns (uint256 amountMinted) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        if (!state.allowedVaults[_vault]) revert VaultNotAllowed(_vault);
        
        INftVault vault = INftVault(_vault);
        
        for (uint256 i = 0; i < _collections.length; i++) {
            INftVault.CollectionData memory data = vault.getAllowedCollectionData(_collections[i]);
            
            if (data.nftType == INftVault.NftType.ERC721) {
                IERC721(_collections[i]).safeTransferFrom(msg.sender, _vault, _tokenIds[i]);
            } else {
                IERC1155(_collections[i]).safeTransferFrom(msg.sender, _vault, _tokenIds[i], _amounts[i], "");
            }
        }
        
        amountMinted = vault.depositBatch(msg.sender, _collections, _tokenIds, _amounts);
        emit VaultDeposit(_vault, msg.sender, amountMinted);
    }
    
    function withdrawFromVault(
        address[] calldata _collections,
        uint256[] calldata _tokenIds,
        uint256[] calldata _amounts,
        address _vault
    ) external returns (uint256 amountBurned) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        if (!state.allowedVaults[_vault]) revert VaultNotAllowed(_vault);
        
        amountBurned = INftVault(_vault).withdrawBatch(msg.sender, _collections, _tokenIds, _amounts);
        emit VaultWithdraw(_vault, msg.sender, amountBurned);
    }
    
    function swapNFTsForTokens(
        address[] calldata _collections,
        uint256[] calldata _tokenIds,
        uint256[] calldata _amounts,
        uint256 _amountOutMin,
        address[] calldata _path,
        uint256 _deadline
    ) external returns (uint256[] memory amounts) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        
        amounts = IMagicSwapV2Router(state.magicSwapRouter).swapNftForTokens(
            _collections, _tokenIds, _amounts, _amountOutMin, _path, msg.sender, _deadline
        );
        
        emit NFTSwapped(msg.sender, _path[0], _path[_path.length - 1], amounts[amounts.length - 1]);
    }
    
    // ============ META TRANSACTIONS ============
    
    function getNonce(address _user) external view returns (uint256) {
        return TreasureStorage.getState().nonces[_user];
    }
    
    function executeMetaTx(
        address _user,
        bytes calldata _functionData,
        bytes32 _r,
        bytes32 _s,
        uint8 _v
    ) external returns (bytes memory) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            _getDomainSeparator(),
            keccak256(abi.encode(
                keccak256("MetaTransaction(address user,uint256 nonce,bytes functionData)"),
                _user,
                state.nonces[_user]++,
                keccak256(_functionData)
            ))
        ));
        
        address signer = ecrecover(digest, _v, _r, _s);
        if (signer != _user) revert InvalidSignature();
        
        (bool success, bytes memory result) = address(this).call(
            abi.encodePacked(_functionData, _user)
        );
        require(success, "Meta transaction failed");
        
        return result;
    }
    
    function _getDomainSeparator() internal view returns (bytes32) {
        return keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("TreasureIntegration")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getTreasureConfig() external view returns (
        address gasTokenPriceFeed,
        address magicToken,
        address magicSwapRouter,
        address magicSwapFactory,
        uint256 totalRecipes,
        uint256 chainId
    ) {
        TreasureStorage.State storage state = TreasureStorage.getState();
        return (
            state.gasTokenUSDPriceFeed,
            state.magicTokenAddress,
            state.magicSwapRouter,
            state.magicSwapFactory,
            state.currentRecipeId,
            block.chainid
        );
    }
    
    // ERC1155 Receiver
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
    
    // ERC721 Receiver
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
