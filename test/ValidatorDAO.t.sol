// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SponsorDAO.sol";
import "../src/ValidatorDAO.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @title Test PYUSD Token
contract TestPYUSD is ERC20 {
    constructor() ERC20("PYUSD Test", "PYUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title ValidatorDAO Integration Test (frontend hash verification)
contract ValidatorDAOIntegrationTest is Test {
    SponsorDAO sponsorDAO;
    ValidatorDAO validatorDAO;
    TestPYUSD pyusd;

    address deployer = address(1);
    address sponsor = address(2);
    address participant1 = address(3);
    address participant2 = address(4);
    address validator = address(5);

    function setUp() public {
        // Deploy PYUSD
        pyusd = new TestPYUSD();
        pyusd.mint(deployer, 1_000_000 * 1e18);
        pyusd.mint(sponsor, 500_000 * 1e18);
        pyusd.mint(participant1, 500_000 * 1e18);
        pyusd.mint(participant2, 500_000 * 1e18);

        // Deploy SponsorDAO
        vm.startPrank(deployer);
        sponsorDAO = new SponsorDAO(IERC20(address(pyusd)));

        // Deposit DAO funds for 10% bonuses
        pyusd.approve(address(sponsorDAO), 100_000 * 1e18);
        sponsorDAO.depositDAOFunds(100_000 * 1e18);

        // Grant validator role (no need for SPONSOR_ROLE)
        sponsorDAO.grantRole(sponsorDAO.VALIDATOR_ROLE(), validator);
        vm.stopPrank();

        // Deploy ValidatorDAO
        vm.startPrank(deployer);
        validatorDAO = new ValidatorDAO(address(sponsorDAO));
        validatorDAO.grantRole(validatorDAO.VALIDATOR_ROLE(), validator);
        vm.stopPrank();

        // Connect SponsorDAO to ValidatorDAO
        vm.startPrank(deployer);
        sponsorDAO.setValidatorDAO(address(validatorDAO));
        sponsorDAO.grantRole(sponsorDAO.VALIDATOR_ROLE(), address(validatorDAO));
        vm.stopPrank();
    }

    function testCorrectSubmissionEndsChallenge() public {
        // Anyone can create challenge
        vm.startPrank(sponsor);
        pyusd.approve(address(sponsorDAO), 1000 * 1e18);
        uint256 challengeId =
            sponsorDAO.createChallenge(1000 * 1e18, keccak256("Blockchain"), "ipfs://challenge-metadata");
        vm.stopPrank();

        bytes32 correctHash = keccak256("123456");

        // Validator submits correct answer
        vm.startPrank(validator);

        // 1️⃣ Expect AnswerSubmitted event
        vm.expectEmit(true, true, false, true, address(validatorDAO));
        emit ValidatorDAO.AnswerSubmitted(challengeId, participant2, true);

        // 2️⃣ Expect ChallengeCompleted event from SponsorDAO
        uint256 expectedTotalStaked = 1000 * 1e18 + 100 * 1e18; // creator + DAO 10%
        vm.expectEmit(true, true, false, true, address(sponsorDAO));
        emit SponsorDAO.ChallengeCompleted(challengeId, participant2, expectedTotalStaked);

        // 3️⃣ Expect WinnerFound event
        vm.expectEmit(true, true, false, true, address(validatorDAO));
        emit ValidatorDAO.WinnerFound(challengeId, participant2);

        // Call submitAnswer
        validatorDAO.submitAnswer(challengeId, correctHash, correctHash, participant2);
        vm.stopPrank();

        // Challenge should now be inactive
        (,,,,, bool active,,,,) = sponsorDAO.getChallengeBasicInfo(challengeId);
        assertFalse(active);

        // Winner received total stake
        uint256 expectedBalance = 500_000 * 1e18 + 1000 * 1e18 + 100 * 1e18;
        assertEq(pyusd.balanceOf(participant2), expectedBalance);
    }

    function testMultipleSubmissions() public {
        // Anyone can create challenge
        vm.startPrank(sponsor);
        pyusd.approve(address(sponsorDAO), 500 * 1e18);
        uint256 challengeId = sponsorDAO.createChallenge(500 * 1e18, keccak256("Solidity"), "ipfs://meta");
        vm.stopPrank();

        vm.startPrank(validator);

        // participant1 wrong submission
        vm.expectEmit(true, true, false, true, address(validatorDAO));
        emit ValidatorDAO.AnswerSubmitted(challengeId, participant1, false);
        validatorDAO.submitAnswer(challengeId, keccak256("wrong1"), keccak256("answer"), participant1);

        // participant2 wrong submission
        vm.expectEmit(true, true, false, true, address(validatorDAO));
        emit ValidatorDAO.AnswerSubmitted(challengeId, participant2, false);
        validatorDAO.submitAnswer(challengeId, keccak256("wrong2"), keccak256("answer"), participant2);

        // Challenge still active
        (,,,,, bool active,,,,) = sponsorDAO.getChallengeBasicInfo(challengeId);
        assertTrue(active);

        // participant1 correct submission
        vm.expectEmit(true, true, false, true, address(validatorDAO));
        emit ValidatorDAO.AnswerSubmitted(challengeId, participant1, true);

        // ChallengeCompleted from SponsorDAO
        uint256 expectedTotalStaked = 500 * 1e18 + 50 * 1e18; // creator + DAO 10%
        vm.expectEmit(true, true, false, true, address(sponsorDAO));
        emit SponsorDAO.ChallengeCompleted(challengeId, participant1, expectedTotalStaked);

        // WinnerFound
        vm.expectEmit(true, true, false, true, address(validatorDAO));
        emit ValidatorDAO.WinnerFound(challengeId, participant1);

        validatorDAO.submitAnswer(challengeId, keccak256("answer"), keccak256("answer"), participant1);
        vm.stopPrank();

        // Challenge now inactive
        (,,,,, active,,,,) = sponsorDAO.getChallengeBasicInfo(challengeId);
        assertFalse(active);

        // Winner balance
        uint256 expectedBalance = 500_000 * 1e18 + 500 * 1e18 + 50 * 1e18;
        assertEq(pyusd.balanceOf(participant1), expectedBalance);
    }

    function testParticipantCanCreateAndWin() public {
        // Test that a regular participant can create their own challenge
        vm.startPrank(participant1);
        pyusd.approve(address(sponsorDAO), 300 * 1e18);
        uint256 challengeId = sponsorDAO.createChallenge(300 * 1e18, keccak256("Web3"), "ipfs://web3-meta");
        vm.stopPrank();

        (address creator,,,,,,,,,) = sponsorDAO.getChallengeBasicInfo(challengeId);
        assertEq(creator, participant1, "Creator should be participant1");

        // Another participant can win
        bytes32 correctHash = keccak256("correct-answer");
        vm.startPrank(validator);
        validatorDAO.submitAnswer(challengeId, correctHash, correctHash, participant2);
        vm.stopPrank();

        // Verify participant2 won
        uint256 expectedBalance = 500_000 * 1e18 + 300 * 1e18 + 30 * 1e18; // initial + stake + 10% bonus
        assertEq(pyusd.balanceOf(participant2), expectedBalance);
    }
}
