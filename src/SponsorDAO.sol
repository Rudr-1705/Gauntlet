// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin
import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/access/AccessControl.sol";

/// @title SponsorDAO
/// @notice Handles creation of PYUSD-based challenges and participant staking (escrow)
contract SponsorDAO is Ownable, AccessControl {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant SPONSOR_ROLE = keccak256("SPONSOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    // Token (PYUSD)
    IERC20 public immutable pyusd;
    address public validatorDAO;

    // ID counter
    uint256 private _challengeIdCounter = 1;

    // Challenge struct
    struct Challenge {
        address creator;
        IERC20 rewardToken;
        uint256 stakeAmount;
        uint256 totalStaked;
        uint256 startTime;
        uint256 endTime;
        address[] participants;
        address winner;
        bool active;
        bool verified;
        bytes32 domain;
        string metadataURI;
    }

    mapping(uint256 => Challenge) private _challenges;

    // ------------------------------
    // Events
    // ------------------------------
    event ChallengeCreated(
        uint256 indexed id,
        address indexed creator,
        uint256 stakeAmount,
        bytes32 domain,
        string metadataURI,
        uint256 startTime,
        uint256 endTime
    );

    event ChallengeFunded(
        uint256 indexed id,
        address indexed participant,
        uint256 amount
    );
    event ChallengeVerified(uint256 indexed id, bool verified);
    event ChallengeCompleted(
        uint256 indexed id,
        address indexed winner,
        uint256 rewardAmount
    );
    event ChallengeSubmitted(
        uint256 indexed id,
        address indexed participant,
        string submissionURI
    );

    // ------------------------------
    // Constructor
    // ------------------------------

    /// @notice Allows the DAO owner to deposit PYUSD into the contract
    /// @dev These funds are used for the DAO's 10% contributions to new challenges
    function depositDAOFunds(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        pyusd.safeTransferFrom(msg.sender, address(this), amount);
    }

    constructor(IERC20 _pyusd) Ownable(msg.sender) {
        require(address(_pyusd) != address(0), "PYUSD cannot be zero");
        pyusd = _pyusd;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(SPONSOR_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(VALIDATOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function setValidatorDAO(
        address _validatorDAO
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        validatorDAO = _validatorDAO;
    }

    // ------------------------------
    // Core Functions
    // ------------------------------
    function _getNextChallengeId() internal returns (uint256) {
        return _challengeIdCounter++;
    }

    function createChallenge(
        uint256 stakeAmount,
        bytes32 domain,
        string calldata metadataURI
    ) external onlyRole(SPONSOR_ROLE) returns (uint256) {
        require(stakeAmount > 0, "Stake must be > 0");

        uint256 id = _getNextChallengeId();
        Challenge storage c = _challenges[id];

        // --- Set automatic time window ---
        uint256 startTime = block.timestamp;
        uint256 endTime = type(uint256).max;

        // --- DAO contributes 10% of creator’s stake ---
        uint256 daoBonus = stakeAmount / 10; // 10%
        uint256 totalStake = stakeAmount + daoBonus;

        // --- Verify DAO has enough PYUSD for its bonus ---
        require(
            pyusd.balanceOf(address(this)) >= daoBonus,
            "DAO lacks PYUSD for 10% bonus"
        );

        // --- Initialize challenge data ---
        c.creator = msg.sender;
        c.rewardToken = pyusd;
        c.stakeAmount = stakeAmount;
        c.totalStaked = totalStake;
        c.startTime = startTime;
        c.endTime = endTime;
        c.active = true;
        c.verified = false;
        c.domain = domain;
        c.metadataURI = metadataURI;
        c.participants.push(msg.sender);

        // --- Transfer creator's PYUSD stake into escrow ---
        pyusd.safeTransferFrom(msg.sender, address(this), stakeAmount);

        // --- Emit event with auto-generated time window ---
        emit ChallengeCreated(
            id,
            msg.sender,
            totalStake,
            domain,
            metadataURI,
            startTime,
            endTime
        );

        return id;
    }

    function fundChallenge(uint256 id, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        Challenge storage c = _challenges[id];
        require(c.active, "Challenge not active");
        require(
            block.timestamp >= c.startTime && block.timestamp <= c.endTime,
            "Outside challenge period"
        );

        pyusd.safeTransferFrom(msg.sender, address(this), amount);
        c.totalStaked += amount;

        bool exists;
        for (uint256 i = 0; i < c.participants.length; i++) {
            if (c.participants[i] == msg.sender) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            c.participants.push(msg.sender);
        }

        emit ChallengeFunded(id, msg.sender, amount);
    }

    /// @notice Called by participants to submit off-chain answers
    function submitAnswer(uint256 id, string calldata submissionURI) external {
        Challenge storage c = _challenges[id];
        require(c.active, "Challenge not active");

        // Require participant has funded (or is the creator)
        bool isParticipant = false;
        for (uint256 i = 0; i < c.participants.length; i++) {
            if (c.participants[i] == msg.sender) {
                isParticipant = true;
                break;
            }
        }
        require(isParticipant, "Must fund challenge to submit answer");

        emit ChallengeSubmitted(id, msg.sender, submissionURI);
    }

    function verifyChallenge(
        uint256 id,
        bool verified
    ) external onlyRole(VALIDATOR_ROLE) {
        Challenge storage c = _challenges[id];
        require(c.active, "Challenge not active");
        require(!c.verified, "Already verified");

        c.verified = verified;
        emit ChallengeVerified(id, verified);
    }

    function completeChallenge(
        uint256 id,
        address winner
    ) external onlyRole(VALIDATOR_ROLE) {
        Challenge storage c = _challenges[id];
        require(c.active, "Challenge not active");
        require(c.verified, "Challenge not verified");
        require(winner != address(0), "Winner cannot be zero");

        c.active = false;
        c.winner = winner;

        pyusd.safeTransfer(winner, c.totalStaked);
        emit ChallengeCompleted(id, winner, c.totalStaked);
    }

    // ------------------------------
    // Getter Functions
    // ------------------------------
    function getChallengeBasicInfo(
        uint256 id
    )
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
        Challenge storage c = _challenges[id];
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

    function getParticipants(
        uint256 id
    ) external view returns (address[] memory) {
        return _challenges[id].participants;
    }
}
