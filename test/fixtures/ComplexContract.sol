// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ComplexContract {
    mapping(address => uint256) public balances;
    address[] public holders;
    uint256 public totalSupply;
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(to != address(0), "Invalid recipient");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
    
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(balances[msg.sender] >= amounts[i], "Insufficient balance");
            balances[msg.sender] -= amounts[i];
            balances[recipients[i]] += amounts[i];
        }
    }
    
    function inefficientLoop() public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < holders.length; i++) {
            total += balances[holders[i]];
        }
        return total;
    }
    
    function multipleRequires(uint256 a, uint256 b, uint256 c) external pure returns (uint256) {
        require(a > 0, "A must be positive");
        require(b > 0, "B must be positive");
        require(c > 0, "C must be positive");
        require(a < 1000, "A too large");
        require(b < 1000, "B too large");
        
        return a + b + c;
    }
}
