// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin
import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/access/AccessControl.sol";

/// @title SponsorDAO (hackathon-ready slice)
/// @notice Handles creation of PYUSD-based challenges and participant staking (escrow)
contract SponsorDAO is Ownable, AccessControl {
    using SafeERC20 for IERC20;

    // -----------------------------
    // Roles
    // -----------------------------
    bytes32 public constant SPONSOR_ROLE = keccak256("SPONSOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    // -----------------------------
    // Token (PYUSD)
    // -----------------------------
    /// @notice Immutable PYUSD token used for all staking/rewards
    IERC20 public immutable pyusd;

    // -----------------------------
    // ID counter
    // -----------------------------
    uint256 private _challengeIdCounter = 1;

    function _getNextChallengeId() internal returns (uint256) {
        return _challengeIdCounter++;
    }

    // -----------------------------
    // Challenge struct
    // -----------------------------
    /// @notice A challenge. Note: no per-participant stakes mapping — we store totalStaked and participants array.
    struct Challenge {
        address creator; // Creator of the challenge
        IERC20 rewardToken; // Always PYUSD (kept for clarity)
        uint256 stakeAmount; // Creator's initial stake
        uint256 totalStaked; // Sum of all stakes (creator + participants)
        uint256 startTime; // Start timestamp
        uint256 endTime; // End timestamp
        address[] participants; // Participants list (for equal-split payout)
        address winner; // Winner address (set by validator)
        bool active; // True while challenge is ongoing
        bool verified; // Validator verified
        bytes32 domain; // Category / domain
        string metadataURI; // Off-chain metadata link (IPFS/URI)
    }

    // Store challenges (challengeId => Challenge). Note: Challenge contains a dynamic array.
    mapping(uint256 => Challenge) private _challenges;

    // -----------------------------
    // Events
    // -----------------------------
    event ChallengeCreated(
        uint256 indexed challengeId,
        address indexed creator,
        uint256 stakeAmount,
        bytes32 domain,
        string metadataURI,
        uint256 startTime,
        uint256 endTime
    );

    event ChallengeFunded(uint256 indexed challengeId, address indexed participant, uint256 amount);

    event ChallengeVerified(uint256 indexed challengeId, bool verified);

    event ChallengeCompleted(uint256 indexed challengeId, address indexed winner, uint256 rewardAmount);

    // -----------------------------
    // Constructor
    // -----------------------------
    /// @param _pyusd address of the PYUSD token (ERC20)
    constructor(IERC20 _pyusd) Ownable(msg.sender) {
        require(address(_pyusd) != address(0), "PYUSD cannot be zero");
        pyusd = _pyusd;

        // Grant deployer DEFAULT_ADMIN_ROLE and set role admins
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(SPONSOR_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(VALIDATOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    // -----------------------------
    // Create a challenge (Sponsor only)
    // -----------------------------
    /// @notice Creates a new challenge. Creator must approve pyusd for this contract.
    /// @dev Creator is automatically added as the first participant and their stake is escrowed.
    function createChallenge(
        uint256 stakeAmount,
        uint256 startTime,
        uint256 endTime,
        bytes32 domain,
        string calldata metadataURI
    ) external onlyRole(SPONSOR_ROLE) returns (uint256) {
        require(stakeAmount > 0, "Stake must be > 0");
        require(startTime < endTime, "Invalid time window");

        uint256 challengeId = _getNextChallengeId();
        Challenge storage c = _challenges[challengeId];

        c.creator = msg.sender;
        c.rewardToken = pyusd; // explicitly record PYUSD
        c.stakeAmount = stakeAmount;
        c.totalStaked = stakeAmount;
        c.startTime = startTime;
        c.endTime = endTime;
        c.active = true;
        c.verified = false;
        c.domain = domain;
        c.metadataURI = metadataURI;

        // Add the creator as a participant and record their stake implicitly
        c.participants.push(msg.sender);

        // Transfer PYUSD from creator to contract (escrow)
        pyusd.safeTransferFrom(msg.sender, address(this), stakeAmount);

        emit ChallengeCreated(challengeId, msg.sender, stakeAmount, domain, metadataURI, startTime, endTime);

        return challengeId;
    }

    // -----------------------------
    // Fund a challenge (participant staking)
    // -----------------------------
    /// @notice Participants call this to stake PYUSD into an existing challenge.
    /// @dev Adds participant to participants[] if first-time contributor.
    function fundChallenge(uint256 challengeId, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        Challenge storage c = _challenges[challengeId];
        require(c.active, "Challenge not active");
        require(block.timestamp >= c.startTime && block.timestamp <= c.endTime, "Outside challenge period");

        // Transfer PYUSD from participant to contract
        pyusd.safeTransferFrom(msg.sender, address(this), amount);

        // Update totals
        c.totalStaked += amount;

        // Add participant to array if not present
        bool exists = false;
        for (uint256 i = 0; i < c.participants.length; i++) {
            if (c.participants[i] == msg.sender) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            c.participants.push(msg.sender);
        }

        emit ChallengeFunded(challengeId, msg.sender, amount);
    }

    // -----------------------------
    // Helper getters (no mappings returned)
    // -----------------------------
    /// @notice Returns the basic, serializable info of a challenge (does not return participants array length ideally)
    function getChallengeBasicInfo(uint256 challengeId)
        external
        view
        returns (
            address creator,
            uint256 stakeAmount,
            uint256 totalStaked,
            uint256 startTime,
            uint256 endTime,
            bool active,
            bool verified,
            bytes32 domain,
            string memory metadataURI,
            uint256 participantCount
        )
    {
        Challenge storage c = _challenges[challengeId];
        return (
            c.creator,
            c.stakeAmount,
            c.totalStaked,
            c.startTime,
            c.endTime,
            c.active,
            c.verified,
            c.domain,
            c.metadataURI,
            c.participants.length
        );
    }

    /// @notice Return participants for off-chain consumption (be careful with gas when array is big)
    function getParticipants(uint256 challengeId) external view returns (address[] memory) {
        return _challenges[challengeId].participants;
    }

    // (Further functions like verifyChallenge, completeChallenge, payoutSplit, etc. will be added next)
}
