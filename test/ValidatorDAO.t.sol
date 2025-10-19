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

/// @title Full ValidatorDAO Integration Test
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

        // Grant roles
        sponsorDAO.grantRole(sponsorDAO.SPONSOR_ROLE(), sponsor);
        sponsorDAO.grantRole(sponsorDAO.VALIDATOR_ROLE(), validator);
        // ✅ Grant VALIDATOR_ROLE to ValidatorDAO contract itself
        // This allows ValidatorDAO to call completeChallenge
        vm.stopPrank();

        // Deploy ValidatorDAO
        vm.startPrank(deployer);
        validatorDAO = new ValidatorDAO(address(sponsorDAO));
        validatorDAO.grantRole(validatorDAO.VALIDATOR_ROLE(), validator);
        vm.stopPrank();

        // Connect SponsorDAO to ValidatorDAO
        vm.startPrank(deployer);
        sponsorDAO.setValidatorDAO(address(validatorDAO));
        // ✅ Grant VALIDATOR_ROLE to ValidatorDAO on SponsorDAO
        sponsorDAO.grantRole(
            sponsorDAO.VALIDATOR_ROLE(),
            address(validatorDAO)
        );
        vm.stopPrank();
    }

    function testFullEventDrivenFlow() public {
        // ---------------------------
        // 1️⃣ Sponsor creates challenge
        // ---------------------------
        vm.startPrank(sponsor);
        pyusd.approve(address(sponsorDAO), 1000 * 1e18);

        uint256 start = block.timestamp;
        uint256 end = block.timestamp + 3600;

        uint256 challengeId = sponsorDAO.createChallenge(
            1000 * 1e18,
            start,
            end,
            keccak256("Blockchain"),
            "ipfs://challenge-metadata"
        );
        vm.stopPrank();

        // ---------------------------
        // 2️⃣ Participants fund & submit answers
        // ---------------------------
        vm.startPrank(participant1);
        pyusd.approve(address(sponsorDAO), 500 * 1e18);
        sponsorDAO.fundChallenge(challengeId, 100 * 1e18);
        sponsorDAO.submitAnswer(challengeId, "ipfs://answer1");
        vm.stopPrank();

        vm.startPrank(participant2);
        pyusd.approve(address(sponsorDAO), 500 * 1e18);
        sponsorDAO.fundChallenge(challengeId, 200 * 1e18);
        sponsorDAO.submitAnswer(challengeId, "ipfs://answer2");
        vm.stopPrank();

        // ---------------------------
        // 3️⃣ Off-chain listener registers challenge
        // ---------------------------
        vm.startPrank(validator);
        validatorDAO.registerChallengeForValidation(challengeId);
        vm.stopPrank();

        // ---------------------------
        // 4️⃣ Off-chain zk decides winner
        // ---------------------------
        vm.startPrank(validator);
        // simulate zk verification: participant2 wins
        sponsorDAO.verifyChallenge(challengeId, true);
        validatorDAO.submitValidationResult(
            challengeId,
            participant2,
            "zkhash://proof1"
        );
        vm.stopPrank();

        // ---------------------------
        // 5️⃣ Verify outcomes
        // ---------------------------
        (
            ,
            ,
            uint256 totalStaked,
            ,
            ,
            bool active,
            bool verified,
            ,
            ,
            uint256 participantCount
        ) = sponsorDAO.getChallengeBasicInfo(challengeId);

        // Total staked is sum of sponsor + participants
        assertEq(totalStaked, 1000 * 1e18 + 100 * 1e18 + 200 * 1e18);
        assertTrue(verified);
        assertFalse(active);
        assertEq(participantCount, 3);

        // Winner received total staked PYUSD
        uint256 expectedWinnerBalance = 500_000 *
            1e18 -
            200 *
            1e18 +
            totalStaked;
        assertEq(pyusd.balanceOf(participant2), expectedWinnerBalance);

        // ValidatorDAO marks challenge as validated
        uint256[] memory pending = validatorDAO.getPendingChallenges();
        assertEq(pending.length, 0);
        assertTrue(validatorDAO.validated(challengeId));
    }

    function testNoWinnerFallsBackToCreator() public {
        vm.startPrank(sponsor);
        pyusd.approve(address(sponsorDAO), 500 * 1e18);

        uint256 start = block.timestamp;
        uint256 end = block.timestamp + 3600;

        uint256 challengeId = sponsorDAO.createChallenge(
            500 * 1e18,
            start,
            end,
            keccak256("AI"),
            "ipfs://challenge-metadata-2"
        );
        vm.stopPrank();

        // No participant submission
        vm.startPrank(validator);
        sponsorDAO.verifyChallenge(challengeId, true);
        validatorDAO.submitValidationResult(
            challengeId,
            address(0),
            "zkhash://proof2"
        ); // fallback winner
        vm.stopPrank();

        // Creator receives staked PYUSD
        assertEq(pyusd.balanceOf(sponsor), 500_000 * 1e18);

        // ValidatorDAO marks challenge as validated
        assertTrue(validatorDAO.validated(challengeId));
    }
}
