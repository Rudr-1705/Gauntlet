// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SponsorDAO.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @dev Simple mintable PYUSD mock for testing
contract MockPYUSD is ERC20 {
    constructor() ERC20("PYUSD Test", "PYUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title SponsorDAO Foundry Tests
contract SponsorDAOTest is Test {
    SponsorDAO dao;
    MockPYUSD pyusd;

    address creator = address(this);

    function setUp() public {
        // Deploy dummy PYUSD token
        pyusd = new MockPYUSD();
        pyusd.mint(creator, 1_000_000 * 1e18);

        // Deploy SponsorDAO with PYUSD
        dao = new SponsorDAO(IERC20(address(pyusd)));

        // Grant roles
        dao.grantRole(dao.SPONSOR_ROLE(), creator);
        dao.grantRole(dao.VALIDATOR_ROLE(), creator);
    }

    function testChallengeIdIncrements() public {
        uint256 id1 = dao.call_getNextChallengeId();
        uint256 id2 = dao.call_getNextChallengeId();
        assertEq(id1 + 1, id2, "Challenge ID should increment by 1");
    }

    function testRoles() public view {
        assertTrue(
            dao.hasRole(dao.DEFAULT_ADMIN_ROLE(), creator),
            "Deployer should be admin"
        );
    }

    function testCreateChallenge() public {
        pyusd.approve(address(dao), 1000 * 1e18);

        uint256 stakeAmount = 1000 * 1e18;
        uint256 startTime = block.timestamp + 60;
        uint256 endTime = block.timestamp + 3600;
        bytes32 domain = keccak256("BLOCKCHAIN");
        string memory metadataURI = "ipfs://QmTestFile";

        uint256 challengeId = dao.createChallenge(
            stakeAmount,
            startTime,
            endTime,
            domain,
            metadataURI
        );

        assertEq(challengeId, 1);

        (
            address cCreator,
            uint256 cStakeAmount,
            uint256 cTotalStaked,
            uint256 cStartTime,
            uint256 cEndTime,
            bool cActive,
            bool cVerified,
            bytes32 cDomain,
            string memory cMetadata
        ) = dao.getChallengeBasicInfo(challengeId);

        assertEq(cCreator, creator);
        assertEq(cStakeAmount, stakeAmount);
        assertEq(cTotalStaked, stakeAmount);
        assertEq(cStartTime, startTime);
        assertEq(cEndTime, endTime);
        assertTrue(cActive);
        assertTrue(!cVerified);
        assertEq(cDomain, domain);
        assertEq(cMetadata, metadataURI);
    }
}
