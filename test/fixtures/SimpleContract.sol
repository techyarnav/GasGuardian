// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleContract {
    uint256 public value;
    
    function setValue(uint256 _value) public {
        value = _value;
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
    
    function simpleTransfer(address to, uint256 amount) external {
        // Simple transfer logic without optimization
        require(to != address(0), "Invalid address");
        require(amount > 0, "Invalid amount");
        // Transfer logic here
    }
}
