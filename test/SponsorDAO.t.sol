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

        // Use startPrank so deployer is correctly msg.sender during constructor and admin calls
        vm.startPrank(deployer);

        // Deploy SponsorDAO as deployer
        dao = new SponsorDAO(IERC20(address(pyusd)));

        // Grant SPONSOR_ROLE to sponsor
        dao.grantRole(dao.SPONSOR_ROLE(), sponsor);
        dao.grantRole(dao.VALIDATOR_ROLE(), validator);

        vm.stopPrank();

        // Optional: confirm roles
        assertTrue(dao.hasRole(dao.DEFAULT_ADMIN_ROLE(), deployer));
        assertTrue(dao.hasRole(dao.SPONSOR_ROLE(), sponsor));
    }

    function testCompleteChallenge() public {
        // 1️⃣ Sponsor creates a challenge
        vm.startPrank(sponsor);
        pyusd.approve(address(dao), 1000 * 1e18);
        uint256 start = block.timestamp;
        uint256 end = block.timestamp + 3600;
        uint256 id = dao.createChallenge(
            1000 * 1e18,
            start,
            end,
            keccak256("Blockchain"),
            "ipfs://metadata"
        );
        vm.stopPrank();

        // 2️⃣ Admin grants VALIDATOR_ROLE to deployer
        vm.startPrank(deployer);
        dao.grantRole(dao.VALIDATOR_ROLE(), deployer);
        vm.stopPrank();

        // 3️⃣ Validator verifies the challenge
        vm.startPrank(deployer);
        dao.verifyChallenge(id, true);
        vm.stopPrank();

        // 4️⃣ Participant funds challenge
        vm.startPrank(participant1);
        pyusd.approve(address(dao), 500 * 1e18);
        dao.fundChallenge(id, 500 * 1e18);
        vm.stopPrank();

        // Total stake should now be 1500 PYUSD
        (, , uint256 totalStaked, , , , , , , ) = dao.getChallengeBasicInfo(id);
        assertEq(totalStaked, 1500 * 1e18);

        // 5️⃣ Validator completes the challenge with participant1 as winner
        vm.startPrank(deployer);
        uint256 balanceBefore = pyusd.balanceOf(participant1);
        dao.completeChallenge(id, participant1);
        vm.stopPrank();

        uint256 balanceAfter = pyusd.balanceOf(participant1);

        // Verify payout & status
        assertEq(balanceAfter - balanceBefore, 1500 * 1e18);
        (, , , , , bool active, , , , ) = dao.getChallengeBasicInfo(id);
        assertFalse(active, "Challenge should be inactive after completion");
    }

    function testCannotVerifyIfNotValidator() public {
        vm.startPrank(participant1); // not validator
        vm.expectRevert();
        dao.verifyChallenge(1, true); // should revert since no challenge yet or no role
        vm.stopPrank();
    }

    function testOnlyValidatorCanVerify() public {
        // create challenge first
        vm.startPrank(sponsor);
        pyusd.approve(address(dao), 1000 * 1e18);
        uint256 start = block.timestamp;
        uint256 end = block.timestamp + 3600;
        uint256 id = dao.createChallenge(
            1000 * 1e18,
            start,
            end,
            keccak256("Blockchain"),
            "ipfs://meta"
        );
        vm.stopPrank();

        // try to verify from sponsor (not validator)
        vm.startPrank(sponsor);
        vm.expectRevert();
        dao.verifyChallenge(id, true);
        vm.stopPrank();

        // now grant validator role
        vm.startPrank(deployer);
        dao.grantRole(dao.VALIDATOR_ROLE(), participant1);
        vm.stopPrank();

        // should succeed now
        vm.startPrank(participant1);
        dao.verifyChallenge(id, true);
        vm.stopPrank();
    }

    function testCannotCompleteUnverifiedChallenge() public {
        // create challenge
        vm.startPrank(sponsor);
        pyusd.approve(address(dao), 1000 * 1e18);
        uint256 start = block.timestamp;
        uint256 end = block.timestamp + 3600;
        uint256 id = dao.createChallenge(
            1000 * 1e18,
            start,
            end,
            keccak256("Blockchain"),
            "ipfs://meta"
        );
        vm.stopPrank();

        // try to complete without verification
        vm.startPrank(validator);
        vm.expectRevert(bytes("Challenge not verified"));
        dao.completeChallenge(id, participant1);
        vm.stopPrank();
    }

    function testCannotCompleteTwice() public {
        // setup
        vm.startPrank(sponsor);
        pyusd.approve(address(dao), 1000 * 1e18);
        uint256 id = dao.createChallenge(
            1000 * 1e18,
            block.timestamp,
            block.timestamp + 3600,
            keccak256("Blockchain"),
            "ipfs://meta"
        );
        vm.stopPrank();
        
        // verify & complete
        vm.startPrank(validator);
        dao.verifyChallenge(id, true);
        dao.completeChallenge(id, participant1);
        vm.expectRevert(bytes("Challenge not active"));
        dao.completeChallenge(id, participant1);
        vm.stopPrank();
    }

    function testCannotFundAfterEndTime() public {
        // create challenge that ends immediately
        vm.startPrank(sponsor);
        pyusd.approve(address(dao), 1000 * 1e18);
        uint256 id = dao.createChallenge(
            1000 * 1e18,
            block.timestamp,
            block.timestamp + 1, // ends almost immediately
            keccak256("Blockchain"),
            "ipfs://meta"
        );
        vm.stopPrank();

        // fast-forward beyond end time
        vm.warp(block.timestamp + 10);

        // participant tries to fund -> should revert
        vm.startPrank(participant1);
        pyusd.approve(address(dao), 500 * 1e18);
        vm.expectRevert(bytes("Outside challenge period"));
        dao.fundChallenge(id, 500 * 1e18);
        vm.stopPrank();
    }
}
