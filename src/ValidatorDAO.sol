// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/access/AccessControl.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import "./SponsorDAO.sol";

/// @title ValidatorDAO
/// @notice Connected to SponsorDAO — listens to submissions (via events),
/// verifies zk proofs off-chain, and finalizes winners on-chain.
contract ValidatorDAO is Ownable, AccessControl {
    using EnumerableSet for EnumerableSet.UintSet;

    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    SponsorDAO public sponsorDAO;

    // Track which challenges have been validated to prevent double processing
    mapping(uint256 => bool) public validated;
    EnumerableSet.UintSet private pendingChallenges;

    event ChallengeReceived(uint256 indexed challengeId);
    event ValidationResultSubmitted(
        uint256 indexed challengeId,
        address indexed winner,
        bool success,
        string zkProofHash
    );

    constructor(address _sponsorDAO) Ownable(msg.sender) {
        require(_sponsorDAO != address(0), "Invalid SponsorDAO");
        sponsorDAO = SponsorDAO(_sponsorDAO);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(VALIDATOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    // -------------------------------------------------------
    // Core Functionality
    // -------------------------------------------------------

    /// @notice Called when the off-chain listener detects a new submission event.
    /// It tracks challenge IDs that require validation.
    function registerChallengeForValidation(
        uint256 challengeId
    ) external onlyRole(VALIDATOR_ROLE) {
        if (!pendingChallenges.contains(challengeId)) {
            pendingChallenges.add(challengeId);
            emit ChallengeReceived(challengeId);
        }
    }

    /// @notice After off-chain zk verification, the validator calls this function
    /// to finalize a challenge result and notify SponsorDAO.
    /// @param challengeId The challenge being finalized.
    /// @param winner The verified winner (or address(0) if none).
    /// @param zkProofHash The IPFS or hash reference to proof data.
    function submitValidationResult(
        uint256 challengeId,
        address winner,
        string calldata zkProofHash
    ) external onlyRole(VALIDATOR_ROLE) {
        require(!validated[challengeId], "Already validated");

        validated[challengeId] = true;
        pendingChallenges.remove(challengeId);

        bool success;

        if (winner == address(0)) {
            // If no valid winner, fallback to creator
            (address creator, , , , , , , , , ) = sponsorDAO
                .getChallengeBasicInfo(challengeId);
            sponsorDAO.completeChallenge(challengeId, creator);
            success = true;
        } else {
            sponsorDAO.completeChallenge(challengeId, winner);
            success = true;
        }

        emit ValidationResultSubmitted(
            challengeId,
            winner,
            success,
            zkProofHash
        );
    }

    /// @notice View function for all currently pending validations
    function getPendingChallenges() external view returns (uint256[] memory) {
        return pendingChallenges.values();
    }
}
