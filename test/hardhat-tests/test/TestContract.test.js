const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TestContract", function () {
  let testContract;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const TestContract = await ethers.getContractFactory("TestContract");
    testContract = await TestContract.deploy();
    // Fix: Use waitForDeployment() instead of deployed() for modern Hardhat
    await testContract.waitForDeployment();
  });

  describe("Mint", function () {
    it("Should mint tokens successfully", async function () {
      await testContract.mint(user1.address, 1000);
      
      expect(await testContract.balances(user1.address)).to.equal(1000);
      expect(await testContract.totalSupply()).to.equal(1000);
    });

    it("Should measure mint gas", async function () {
      const tx = await testContract.mint(user1.address, 1000);
      const receipt = await tx.wait();
      console.log("Mint gas used:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.below(200000);
    });
  });

  describe("Transfer", function () {
    beforeEach(async function () {
      await testContract.mint(user1.address, 1000);
    });

    it("Should transfer tokens successfully", async function () {
      await testContract.connect(user1).transfer(user2.address, 500);
      
      expect(await testContract.balances(user1.address)).to.equal(500);
      expect(await testContract.balances(user2.address)).to.equal(500);
    });

    it("Should fail if insufficient balance", async function () {
      await expect(
        testContract.connect(user1).transfer(user2.address, 1500)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should measure transfer gas", async function () {
      const tx = await testContract.connect(user1).transfer(user2.address, 500);
      const receipt = await tx.wait();
      console.log("Transfer gas used:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.below(100000);
    });
  });

  describe("Batch Transfer", function () {
    beforeEach(async function () {
      await testContract.mint(user1.address, 1000);
    });

    it("Should batch transfer successfully", async function () {
      const recipients = [user2.address, owner.address];
      const amounts = [300, 200];
      
      await testContract.connect(user1).batchTransfer(recipients, amounts);
      
      expect(await testContract.balances(user1.address)).to.equal(500);
      expect(await testContract.balances(user2.address)).to.equal(300);
      expect(await testContract.balances(owner.address)).to.equal(200);
    });

    it("Should measure batch transfer gas", async function () {
      const recipients = [user2.address, owner.address, user1.address, user2.address, owner.address];
      const amounts = [100, 100, 100, 100, 100];
      
      const tx = await testContract.connect(user1).batchTransfer(recipients, amounts);
      const receipt = await tx.wait();
      console.log("Batch transfer (5 recipients) gas used:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.below(500000);
    });
  });
});
