// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title PeduliChain: Simple donation contract
/// @author
contract PeduliChain {
    mapping(address => uint256) public donations;
    uint256 public totalDonations;

    event Donated(address indexed donor, uint256 amount);

    /// @dev Donate ETH to the contract
    function donate() external payable {
        require(msg.value > 0, "Donation must be > 0");
        donations[msg.sender] += msg.value;
        totalDonations += msg.value;
        emit Donated(msg.sender, msg.value);
    }
}
