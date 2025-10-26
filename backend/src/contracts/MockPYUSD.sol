// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockPYUSD
 * @notice Mock PYUSD token for Sepolia testnet testing
 */
contract MockPYUSD is ERC20 {
    constructor() ERC20("Mock PayPal USD", "PYUSD") {
        // Mint 1 million PYUSD to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**6); // 6 decimals like real PYUSD
    }

    function decimals() public pure override returns (uint8) {
        return 6; // PYUSD uses 6 decimals
    }

    /**
     * @notice Faucet function - anyone can mint test PYUSD
     */
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Convenient faucet - mint 100 PYUSD to caller
     */
    function requestTokens() external {
        _mint(msg.sender, 100 * 10**6); // 100 PYUSD
    }
}
