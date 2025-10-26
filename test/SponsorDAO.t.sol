// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/SponsorDAO.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @title Test PYUSD Token
contract TestPYUSD is ERC20 {
    constructor() ERC20("PYUSD Test", "PYUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title SponsorDAO Test Suite
contract SponsorDAOTest is Test {
    SponsorDAO dao;
    TestPYUSD pyusd;

    address deployer = address(1);
    address sponsor = address(2);
    address participant1 = address(3);
    address participant2 = address(4);
    address validator = address(5);

    function setUp() public {
        // Deploy test PYUSD token
        pyusd = new TestPYUSD();

        // Mint PYUSD to deployer, sponsor, participants
        pyusd.mint(deployer, 1_000_000 * 1e18);
        pyusd.mint(sponsor, 500_000 * 1e18);
        pyusd.mint(participant1, 500_000 * 1e18);
        pyusd.mint(participant2, 500_000 * 1e18);

        vm.startPrank(deployer);

        // Deploy SponsorDAO as deployer
        dao = new SponsorDAO(IERC20(address(pyusd)));

        // Deposit DAO funds (to cover 10% bonuses)
        pyusd.approve(address(dao), 100_000 * 1e18);
        dao.depositDAOFunds(100_000 * 1e18);

        // Grant VALIDATOR_ROLE (SPONSOR_ROLE not needed since createChallenge is public)
        dao.grantRole(dao.VALIDATOR_ROLE(), validator);

        vm.stopPrank();

        // Assertions
        assertTrue(dao.hasRole(dao.DEFAULT_ADMIN_ROLE(), deployer));
        assertTrue(dao.hasRole(dao.VALIDATOR_ROLE(), validator));
    }

    function testCompleteChallenge() public {
        // Anyone can create a challenge (no role required)
        vm.startPrank(sponsor);
        pyusd.approve(address(dao), 1000 * 1e18);
        uint256 id = dao.createChallenge(1000 * 1e18, keccak256("Blockchain"), "ipfs://metadata");
        vm.stopPrank();

        // Verify DAO auto-time setup
        (,,, uint256 startTime, uint256 endTime,,,,,) = dao.getChallengeBasicInfo(id);
        assertEq(endTime, type(uint256).max, "End time must be max uint256");

        // Validator verifies the challenge
        vm.startPrank(validator);
        dao.verifyChallenge(id, true);
        vm.stopPrank();

        // Participant funds challenge
        vm.startPrank(participant1);
        pyusd.approve(address(dao), 500 * 1e18);
        dao.fundChallenge(id, 500 * 1e18);
        vm.stopPrank();

        // Total stake should now be 1000 + 100 (DAO 10%) + 500 = 1600
        (,, uint256 totalStaked,,,,,,,) = dao.getChallengeBasicInfo(id);
        assertEq(totalStaked, 1600 * 1e18, "Total stake should include DAO bonus");

        // Validator completes the challenge with participant1 as winner
        vm.startPrank(validator);
        uint256 balanceBefore = pyusd.balanceOf(participant1);
        dao.completeChallenge(id, participant1);
        vm.stopPrank();

        uint256 balanceAfter = pyusd.balanceOf(participant1);
        assertEq(balanceAfter - balanceBefore, 1600 * 1e18, "Winner should get total staked");

        // Challenge should now be inactive
        (,,,,, bool active,,,,) = dao.getChallengeBasicInfo(id);
        assertFalse(active, "Challenge should be inactive after completion");
    }

    function testCannotVerifyIfNotValidator() public {
        vm.startPrank(participant1);
        vm.expectRevert();
        dao.verifyChallenge(1, true); // no challenge or role
        vm.stopPrank();
    }

    function testOnlyValidatorCanVerify() public {
        // Anyone can create challenge
        vm.startPrank(sponsor);
        pyusd.approve(address(dao), 1000 * 1e18);
        uint256 id = dao.createChallenge(1000 * 1e18, keccak256("Blockchain"), "ipfs://meta");
        vm.stopPrank();

        // non-validator tries to verify
        vm.startPrank(sponsor);
        vm.expectRevert();
        dao.verifyChallenge(id, true);
        vm.stopPrank();

        // grant validator role to participant1
        vm.startPrank(deployer);
        dao.grantRole(dao.VALIDATOR_ROLE(), participant1);
        vm.stopPrank();

        // should succeed
        vm.startPrank(participant1);
        dao.verifyChallenge(id, true);
        vm.stopPrank();
    }

    function testCannotCompleteUnverifiedChallenge() public {
        // Anyone can create challenge
        vm.startPrank(sponsor);
        pyusd.approve(address(dao), 1000 * 1e18);
        uint256 id = dao.createChallenge(1000 * 1e18, keccak256("Blockchain"), "ipfs://meta");
        vm.stopPrank();

        // attempt to complete without verification
        vm.startPrank(validator);
        vm.expectRevert(bytes("Challenge not verified"));
        dao.completeChallenge(id, participant1);
        vm.stopPrank();
    }

    function testCannotCompleteTwice() public {
        vm.startPrank(sponsor);
        pyusd.approve(address(dao), 1000 * 1e18);
        uint256 id = dao.createChallenge(1000 * 1e18, keccak256("Blockchain"), "ipfs://meta");
        vm.stopPrank();

        // verify & complete
        vm.startPrank(validator);
        dao.verifyChallenge(id, true);
        dao.completeChallenge(id, participant1);
        vm.expectRevert(bytes("Challenge not active"));
        dao.completeChallenge(id, participant1);
        vm.stopPrank();
    }

    function testAnyoneCanCreateChallenge() public {
        // Test that participant1 (non-sponsor) can create challenge
        vm.startPrank(participant1);
        pyusd.approve(address(dao), 2000 * 1e18);
        uint256 id = dao.createChallenge(2000 * 1e18, keccak256("DeFi"), "ipfs://defi-meta");
        vm.stopPrank();

        (address creator,,,,,,,,,) = dao.getChallengeBasicInfo(id);
        assertEq(creator, participant1, "Creator should be participant1");
    }
}
