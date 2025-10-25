// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/access/AccessControl.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "./SponsorDAO.sol";

/// @title ValidatorDAO
/// @notice Validates answers for SponsorDAO challenges and handles winner assignment
contract ValidatorDAO is Ownable, AccessControl {
    SponsorDAO public sponsorDAO;

    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    /// Track validated challenges to prevent double-winning
    mapping(uint256 => bool) public validated;

    /// --------------------
    /// Events
    /// --------------------
    event AnswerSubmitted(uint256 indexed challengeId, address indexed participant, bool isCorrect);

    event WinnerFound(uint256 indexed challengeId, address indexed winner);

    /// --------------------
    /// Constructor
    /// --------------------
    constructor(address _sponsorDAO) Ownable(msg.sender) {
        require(_sponsorDAO != address(0), "Invalid SponsorDAO");
        sponsorDAO = SponsorDAO(_sponsorDAO);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(VALIDATOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /// --------------------
    /// Core Functionality
    /// --------------------
    /// @notice Submit an answer for a challenge. Always emits AnswerSubmitted.
    /// If correct, automatically completes the challenge in SponsorDAO.
    /// @param challengeId The challenge ID
    /// @param submittedAnswerHash Hash of the participant's answer
    /// @param correctAnswerHash Hash of the correct answer (sent from frontend)
    /// @param participant Address of participant
    function submitAnswer(
        uint256 challengeId,
        bytes32 submittedAnswerHash,
        bytes32 correctAnswerHash,
        address participant
    ) external onlyRole(VALIDATOR_ROLE) {
        require(!validated[challengeId], "Challenge already completed");

        bool isCorrect = submittedAnswerHash == correctAnswerHash;

        emit AnswerSubmitted(challengeId, participant, isCorrect);

        if (isCorrect) {
            validated[challengeId] = true;
            sponsorDAO.verifyChallenge(challengeId, true);
            sponsorDAO.completeChallenge(challengeId, participant);
            emit WinnerFound(challengeId, participant);
        }
    }
}
