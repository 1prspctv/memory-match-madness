// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SimplePrizePool - FIXED VERSION
 * @dev Instant payouts when new high scores are set
 * @notice CRITICAL FIX: submitScoreForPlayer now takes player address to pay correct winner
 * @notice Security improvements:
 * - Uses SafeERC20 for token transfers
 * - Checks-Effects-Interactions pattern
 * - Proper event emissions
 * - Backend-only submit function to prevent gas costs for players
 */
contract SimplePrizePool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public immutable houseWallet;
    address public backendWallet; // Authorized to submit scores

    // Prize pools
    uint256 public dailyPool;
    uint256 public allTimePool;

    // Current high scores
    uint256 public dailyHighScore;
    uint256 public allTimeHighScore;
    address public dailyLeader;
    address public allTimeLeader;

    // Track daily reset
    uint256 public lastResetDay;

    // Distribution percentages (in basis points, 10000 = 100%)
    uint256 public constant DAILY_CONTRIBUTION = 6000; // 60%
    uint256 public constant ALLTIME_CONTRIBUTION = 2000; // 20%
    // House gets remaining 20%

    // Events
    event GamePlayed(address indexed player, uint256 amount, uint256 dailyAdded, uint256 allTimeAdded);
    event DailyHighScore(address indexed player, uint256 score, uint256 prize);
    event AllTimeHighScore(address indexed player, uint256 score, uint256 prize);
    event DailyReset(uint256 finalPrize, address indexed winner);
    event EmergencyWithdraw(address indexed owner, uint256 amount);
    event BackendWalletUpdated(address indexed oldWallet, address indexed newWallet);

    // Modifiers
    modifier onlyBackend() {
        require(msg.sender == backendWallet, "Only backend wallet can call this");
        _;
    }

    constructor(address _usdc, address _houseWallet, address _backendWallet) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_houseWallet != address(0), "Invalid house wallet address");
        require(_backendWallet != address(0), "Invalid backend wallet address");
        usdc = IERC20(_usdc);
        houseWallet = _houseWallet;
        backendWallet = _backendWallet;
        lastResetDay = block.timestamp / 1 days;
    }

    /**
     * @dev Update backend wallet address (owner only)
     */
    function setBackendWallet(address _newBackend) external onlyOwner {
        require(_newBackend != address(0), "Invalid backend wallet");
        address oldWallet = backendWallet;
        backendWallet = _newBackend;
        emit BackendWalletUpdated(oldWallet, _newBackend);
    }

    /**
     * @dev Play the game and add to prize pools
     * @param amount Amount of USDC to contribute (with 6 decimals)
     */
    function playGame(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        // Check if we need to reset daily (midnight GMT check)
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastResetDay) {
            _resetDaily();
        }

        // Calculate contributions BEFORE transfer
        uint256 dailyContribution = (amount * DAILY_CONTRIBUTION) / 10000;
        uint256 allTimeContribution = (amount * ALLTIME_CONTRIBUTION) / 10000;
        uint256 houseAmount = amount - dailyContribution - allTimeContribution;

        // Transfer USDC from player to contract (using SafeERC20)
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update prize pools
        dailyPool += dailyContribution;
        allTimePool += allTimeContribution;

        // Send remaining to house wallet
        if (houseAmount > 0) {
            usdc.safeTransfer(houseWallet, houseAmount);
        }

        emit GamePlayed(msg.sender, amount, dailyContribution, allTimeContribution);
    }

    /**
     * @dev Submit a score for a player and trigger payout if it's a new high score
     * @param player The address of the player who achieved the score
     * @param score The score achieved by the player
     * @notice CRITICAL: This function pays the PLAYER, not msg.sender (backend)
     * @notice Only backend wallet can call this to prevent abuse
     */
    function submitScoreForPlayer(address player, uint256 score) external onlyBackend nonReentrant {
        require(player != address(0), "Invalid player address");
        require(score > 0, "Score must be positive");

        // Check if we need to reset daily
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastResetDay) {
            _resetDaily();
        }

        bool wonDaily = false;
        bool wonAllTime = false;
        uint256 dailyPrize = 0;
        uint256 allTimePrize = 0;

        // Check if this is a new daily high score
        if (score > dailyHighScore) {
            wonDaily = true;
            dailyPrize = dailyPool;

            // Update state BEFORE transfer
            dailyHighScore = score;
            dailyLeader = player; // ← FIXED: Store PLAYER address, not msg.sender
            dailyPool = 0;
        }

        // Check if this is a new all-time high score
        if (score > allTimeHighScore) {
            wonAllTime = true;
            allTimePrize = allTimePool;

            // Update state BEFORE transfer
            allTimeHighScore = score;
            allTimeLeader = player; // ← FIXED: Store PLAYER address, not msg.sender
            allTimePool = 0;
        }

        // Transfer prizes AFTER state updates (Checks-Effects-Interactions)
        // ← CRITICAL FIX: Pay PLAYER, not msg.sender (backend wallet)
        if (wonDaily && dailyPrize > 0) {
            usdc.safeTransfer(player, dailyPrize);
            emit DailyHighScore(player, score, dailyPrize);
        }

        if (wonAllTime && allTimePrize > 0) {
            usdc.safeTransfer(player, allTimePrize);
            emit AllTimeHighScore(player, score, allTimePrize);
        }
    }

    /**
     * @dev Reset daily leaderboard (called automatically at midnight GMT)
     * Pays out remaining daily pool to current leader
     */
    function _resetDaily() internal {
        uint256 finalPrize = dailyPool;
        address winner = dailyLeader;

        // Update state BEFORE transfer
        dailyPool = 0;
        dailyHighScore = 0;
        dailyLeader = address(0);
        lastResetDay = block.timestamp / 1 days;

        // Transfer prize AFTER state updates
        if (finalPrize > 0 && winner != address(0)) {
            usdc.safeTransfer(winner, finalPrize);
            emit DailyReset(finalPrize, winner);
        }
    }

    /**
     * @dev Manual daily reset (owner only)
     */
    function manualResetDaily() external onlyOwner nonReentrant {
        _resetDaily();
    }

    /**
     * @dev Reset all-time high score to 0 (owner only)
     */
    function resetAllTimeHighScore() external onlyOwner nonReentrant {
        allTimeHighScore = 0;
        allTimeLeader = address(0);
    }

    /**
     * @dev Get current state
     */
    function getState() external view returns (
        uint256 _dailyPool,
        uint256 _allTimePool,
        uint256 _dailyHighScore,
        uint256 _allTimeHighScore,
        address _dailyLeader,
        address _allTimeLeader
    ) {
        return (
            dailyPool,
            allTimePool,
            dailyHighScore,
            allTimeHighScore,
            dailyLeader,
            allTimeLeader
        );
    }

    /**
     * @dev Emergency withdraw (owner only)
     * @notice Only use in case of critical bugs or migration
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");

        // Reset pool balances to 0
        dailyPool = 0;
        allTimePool = 0;

        usdc.safeTransfer(owner(), balance);
        emit EmergencyWithdraw(owner(), balance);
    }

    /**
     * @dev View function to check contract USDC balance
     */
    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
