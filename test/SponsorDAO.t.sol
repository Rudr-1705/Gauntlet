// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SponsorDAO.sol";

contract SponsorDAOTest is Test {
    SponsorDAO dao;

    function setUp() public {
        // Deploy SponsorDAO contract
        dao = new SponsorDAO();

        dao.grantRole(dao.SPONSOR_ROLE(), address(this));
        dao.grantRole(dao.VALIDATOR_ROLE(), address(this));
    }

    function testChallengeIdIncrements() public {
        // Access internal function via a public wrapper for testing
        uint256 id1 = dao.call_getNextChallengeId();
        uint256 id2 = dao.call_getNextChallengeId();

        assertEq(id1 + 1, id2, "Challenge ID should increment by 1");
    }

    function testRoles() public view {
        // The deployer should have DEFAULT_ADMIN_ROLE
        assertTrue(
            dao.hasRole(dao.DEFAULT_ADMIN_ROLE(), address(this)),
            "Deployer should be admin"
        );
    }
}
