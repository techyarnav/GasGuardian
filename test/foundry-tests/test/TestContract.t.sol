// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/TestContract.sol";

contract TestContractTest is Test {
    TestContract testContract;
    address user1 = address(0x1);
    address user2 = address(0x2);
    
    function setUp() public {
        testContract = new TestContract();
    }
    
    function testMint() public {
        testContract.mint(user1, 1000);
        assertEq(testContract.balances(user1), 1000);
        assertEq(testContract.totalSupply(), 1000);
    }
    
    function testTransfer() public {
        testContract.mint(user1, 1000);
        
        vm.prank(user1);
        testContract.transfer(user2, 500);
        
        assertEq(testContract.balances(user1), 500);
        assertEq(testContract.balances(user2), 500);
    }
    
    function testBatchMint() public {
        address[] memory recipients = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        
        recipients[0] = user1;
        recipients[1] = user2;
        recipients[2] = address(0x3);
        
        amounts[0] = 100;
        amounts[1] = 200;
        amounts[2] = 300;
        
        testContract.batchMint(recipients, amounts);
        
        assertEq(testContract.balances(user1), 100);
        assertEq(testContract.balances(user2), 200);
        assertEq(testContract.totalSupply(), 600);
    }
    
    function testMintGas() public {
        uint256 gasBefore = gasleft();
        testContract.mint(user1, 1000);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Mint gas used:", gasUsed);
    }
    
    function testTransferGas() public {
        testContract.mint(user1, 1000);
        
        vm.prank(user1);
        uint256 gasBefore = gasleft();
        testContract.transfer(user2, 500);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Transfer gas used:", gasUsed);
    }
    
    function testBatchMintGas() public {
        address[] memory recipients = new address[](5);
        uint256[] memory amounts = new uint256[](5);
        
        for (uint256 i = 0; i < 5; i++) {
            recipients[i] = address(uint160(i + 1));
            amounts[i] = 100;
        }
        
        uint256 gasBefore = gasleft();
        testContract.batchMint(recipients, amounts);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Batch mint (5 recipients) gas used:", gasUsed);
    }
}
