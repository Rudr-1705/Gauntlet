// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/access/AccessControl.sol";

contract SponsorDAO is Ownable, AccessControl {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant SPONSOR_ROLE = keccak256("SPONSOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    // Deployer is DEFAULT_ADMIN_ROLE (from AccessControl)
    // Ensures centralized initialization, but further role management is decentralized
    // Admin can assign SPONSOR_ROLE and VALIDATOR_ROLE

    // Challenge ID tracker
    uint256 private _challengeIdCounter = 1;

    function _getNextChallengeId() internal returns (uint256) {
        return _challengeIdCounter++;
    }

    function call_getNextChallengeId() public returns (uint256) {
        return _getNextChallengeId();
    }

    struct Challenge {
        address creator; // Who created the challenge
        IERC20 rewardToken; // PYUSD token
        uint256 stakeAmount; // Stake by creator
        uint256 totalStaked; // Total stake by all participants
        uint256 startTime; // Start timestamp
        uint256 endTime; // End timestamp
        address[] participants; // List of participants
        mapping(address => uint256) stakes; // Individual participant stakes
        address winner; // Winner after verification
        bool active; // Is challenge live
        bool verified; // Has validator DAO verified
        bytes32 domain; // Domain/category of challenge
        string metadataURI; // Link to off-chain info/files
    }

    // Challenge mapping
    mapping(uint256 => Challenge) private _challenges;

    // Events
    event ChallengeCreated(
        uint256 indexed challengeId,
        address indexed creator,
        uint256 stakeAmount,
        bytes32 domain,
        string metadataURI,
        uint256 startTime,
        uint256 endTime
    );

    event ChallengeFunded(
        uint256 indexed challengeId,
        address indexed participant,
        uint256 amount
    );

    event ChallengeVerified(uint256 indexed challengeId, bool verified);

    event ChallengeCompleted(
        uint256 indexed challengeId,
        address indexed winner,
        uint256 rewardAmount
    );

    // Constructor
    constructor() Ownable(msg.sender) {
        // Assign deployer as DEFAULT_ADMIN_ROLE
        // This allows deployer to add SPONSOR_ROLE and VALIDATOR_ROLE members
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _setRoleAdmin(SPONSOR_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(VALIDATOR_ROLE, DEFAULT_ADMIN_ROLE);
    }
}
