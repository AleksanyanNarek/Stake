const {
  time,
  loadFixture,
  mine
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Stake", function () {
  async function deployStakeFixture() {

    const [owner, caller] = await ethers.getSigners();

    const Stake = await ethers.getContractFactory("Stake");
    const stake = await Stake.deploy(100, {value: 10000000});

    const tokenAddress = await stake.token();
    const token = await ethers.getContractAt("StakeToken", tokenAddress);
    await token.mint(stake.address, 1000000000);

    return { stake, token, owner, caller };
  }

  describe("Initialization: ", function() {
    it("Should init with correct args: ", async function () {
        const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

        expect(await stake.minDepositAmount()).to.equal(ethers.BigNumber.from("100"));
        
    });
  });

  describe("Deposit", function () {
    it("Should approve with correct args", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

      const tokenAmount = ethers.BigNumber.from("1000");

      await token.mint(caller.address, tokenAmount);
      await token.connect(caller).approve(stake.address, tokenAmount);

      const blockNumber = await ethers.provider.getBlockNumber() + 1;
      await stake.connect(caller).deposit(tokenAmount);

      const staked = await stake.stakesT(caller.address);

      expect(staked.StackedAmount).to.equal(tokenAmount);
      expect(staked.blockNumber).to.equal(blockNumber);
      expect(staked.status).to.equal(1);
    });
    
    it("Should transfer correct amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

      const tokenAmount = ethers.BigNumber.from("1000");

      await token.mint(caller.address, tokenAmount);
      await token.connect(caller).approve(stake.address, tokenAmount);

      await expect(() => stake.connect(caller).deposit(tokenAmount)).to.changeTokenBalances(token, [stake, caller], [tokenAmount, 0 - tokenAmount]);
    });

    it("Should fail if already have amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);
      
      const tokenAmount = ethers.BigNumber.from("1000");

      await token.mint(caller.address, tokenAmount);
      await token.connect(caller).approve(stake.address, tokenAmount);

      await stake.connect(caller).deposit(tokenAmount);
      
      await expect(stake.connect(caller).deposit(tokenAmount)).to.be.revertedWith("Stack: You already have amount");
    });

    it("Should fail if wrong amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);
      
      const tokenAmount = ethers.BigNumber.from("10");

      await token.mint(caller.address, tokenAmount);
      await token.connect(caller).approve(stake.address, tokenAmount);
      
      await expect(stake.connect(caller).deposit(tokenAmount)).to.be.revertedWith("Stack: Wrong amount");
    });

    it("Should fail if not enough funds", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);
      
      const tokenAmount = ethers.BigNumber.from("1000");

      await token.connect(caller).approve(stake.address, tokenAmount);
      
      await expect(stake.connect(caller).deposit(tokenAmount)).to.be.revertedWith("Stack: Not enough funds");
    });

    it("Should fail if not enough allowance", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);
      
      const tokenAmount = ethers.BigNumber.from("1000");

      await token.mint(caller.address, tokenAmount);
      
      await expect(stake.connect(caller).deposit(tokenAmount)).to.be.revertedWith("Stack: Not enough allowance");
    });
  });

  describe("DepositEther", function () {
    it("Should approve with correct args", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

      const etherAmount = ethers.BigNumber.from("1000");

      await stake.getEther(etherAmount);
      const blockNumber = await ethers.provider.getBlockNumber() + 1;

      await stake.connect(caller).depositEther({value: etherAmount});

      const staked = await stake.stakesE(caller.address);

      expect(staked.StackedAmount).to.equal(etherAmount);
      expect(staked.blockNumber).to.equal(blockNumber);
      expect(staked.status).to.equal(1);
    });
    
    it("Should transfer correct amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

      const etherAmount = ethers.BigNumber.from("1000");

      await stake.getEther(etherAmount);

      await expect(() => stake.connect(caller).depositEther({value: etherAmount})).to.changeEtherBalances([stake, caller], [etherAmount, 0 - etherAmount]);
    });

    it("Should fail if already have amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);
      
      const etherAmount = ethers.BigNumber.from("1000");

      await stake.getEther(etherAmount);

      await stake.connect(caller).depositEther({value: etherAmount});
      
      await expect(stake.connect(caller).depositEther({value: etherAmount})).to.be.revertedWith("Stack: You already have amount");
    });

    it("Should fail if wrong amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);
      
      const etherAmount = ethers.BigNumber.from("10");

      await stake.getEther(etherAmount);
      
      await expect(stake.connect(caller).depositEther({value: etherAmount})).to.be.revertedWith("Stack: Wrong amount");
    });
  });

  describe("withdraw", function () {
    it("Should approve with correct args", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

      const tokenAmount = ethers.BigNumber.from("1000");

      await token.mint(caller.address, tokenAmount);
      await token.connect(caller).approve(stake.address, tokenAmount);

      await stake.connect(caller).deposit(tokenAmount);
      
      await stake.connect(caller).withdraw();

      const staked = await stake.stakesT(caller.address);

      expect(staked.StackedAmount).to.equal(0);
      expect(staked.blockNumber).to.equal(0);
      expect(staked.status).to.equal(0);
    });

    it("Should transfer correct amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

      const tokenAmount = ethers.BigNumber.from("1000");
      const blocks = ethers.BigNumber.from("27");

      await token.mint(caller.address, tokenAmount);
      await token.connect(caller).approve(stake.address, tokenAmount);

      await stake.connect(caller).deposit(tokenAmount);
      await mine(blocks);

      await expect(() => stake.connect(caller).withdraw()).to.changeTokenBalances(token, [stake, caller], [0 - (1200 * 97 / 100), 1200 * 97 / 100]);

      expect(await stake.ownerProfitT()).to.equal(36);
    });

    it("Should fail if you don't have amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);
      
      await expect(stake.connect(caller).withdraw()).to.be.revertedWith("Stack: You don't have amount");
    });
  });

  describe("withdrawEther", function () {
    it("Should approve with correct args", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

      const etherAmount = ethers.BigNumber.from("1000");

      await stake.getEther(etherAmount);

      await stake.connect(caller).depositEther({value: etherAmount});
      
      await stake.connect(caller).withdrawEther();

      const staked = await stake.stakesE(caller.address);

      expect(staked.StackedAmount).to.equal(0);
      expect(staked.blockNumber).to.equal(0);
      expect(staked.status).to.equal(0);
    });

    it("Should transfer correct amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

      const etherAmount = ethers.BigNumber.from("1000");
      const blocks = ethers.BigNumber.from("27");

      await stake.getEther(etherAmount);

      await stake.connect(caller).depositEther({value: etherAmount});

      await mine(blocks);

      await expect(() => stake.connect(caller).withdrawEther()).to.changeEtherBalances([stake, caller], [0 - (1200 * 97 / 100), (1200 * 97 / 100)]);

      expect(await stake.ownerProfitE()).to.equal(36);
    });

    it("Should fail if you don't have amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);
      
      await expect(stake.connect(caller).withdrawEther()).to.be.revertedWith("Stack: You don't have amount");
    });
  });

  describe("withdrawOwnerToken", function () {
    it("Should transfer correct amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

      const tokenAmount = ethers.BigNumber.from("1000");
      const blocks = ethers.BigNumber.from("27");

      await token.mint(caller.address, tokenAmount);
      await token.connect(caller).approve(stake.address, tokenAmount);

      await stake.connect(caller).deposit(tokenAmount);
      await mine(blocks);
      await stake.connect(caller).withdraw()
      
      await expect(() => stake.withdrawOwner(30, 0)).to.changeTokenBalances(token, [stake, owner], [0 - 30, 30]);

      expect(await stake.ownerProfitT()).to.equal(6);
    });

    it("Should fail if not enought profit", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);
      
      const tokenAmount = ethers.BigNumber.from("1000");
      const blocks = ethers.BigNumber.from("27");

      await token.mint(caller.address, tokenAmount);
      await token.connect(caller).approve(stake.address, tokenAmount);

      await stake.connect(caller).deposit(tokenAmount);
      await mine(blocks);
      await stake.connect(caller).withdraw();
      
      await expect(stake.withdrawOwner(100000, 0)).to.be.revertedWith("Stack: Not enought profit");
    });
  });

  describe("withdrawOwnerEther", function () {
    it("Should transfer correct amount", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);

      const etherAmount = ethers.BigNumber.from("1000");
      const blocks = ethers.BigNumber.from("27");

      await stake.getEther(etherAmount);

      await stake.connect(caller).depositEther({value: etherAmount});
      await mine(blocks);
      await stake.connect(caller).withdrawEther();
      
      await expect(() => stake.withdrawOwner(0, 30)).to.changeEtherBalances([stake, owner], [0 - 30, 30]);

      expect(await stake.ownerProfitE()).to.equal(6);
    });

    it("Should fail if not enought profit", async function () {
      const { stake, token, owner, caller } = await loadFixture(deployStakeFixture);
      
      const etherAmount = ethers.BigNumber.from("1000");
      const blocks = ethers.BigNumber.from("27");

      await stake.getEther(etherAmount);

      await stake.connect(caller).depositEther({value: etherAmount});
      await mine(blocks);
      await stake.connect(caller).withdrawEther();
      
      await expect(stake.withdrawOwner(0, 100000)).to.be.revertedWith("Stack: Not enought profit");
    });
  });
});
