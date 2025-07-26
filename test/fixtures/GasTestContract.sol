// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract GasTestContract {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;
    address[] public holders;
    uint256 public totalSupply;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(to != address(0), "Invalid recipient");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        
        if (balances[to] == 0) {
            holders.push(to);
        }
        
        balances[to] += amount;
        totalSupply += amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length > 0, "Empty arrays");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(balances[msg.sender] >= totalAmount, "Insufficient balance");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            balances[msg.sender] -= amounts[i];
            balances[recipients[i]] += amounts[i];
            emit Transfer(msg.sender, recipients[i], amounts[i]);
        }
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "Invalid spender");
        
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    function inefficientSum() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < holders.length; i++) {
            if (balances[holders[i]] > 0) {
                total += balances[holders[i]];
            }
        }
        return total;
    }
}
