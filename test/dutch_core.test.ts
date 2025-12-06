// test/dutch_auction_core.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Dutch Auction Core Functionality", function () {
  let auction: any;
  let auctionFactory: any;
  let imageNFT: any;
  let promptNFT: any;
  let owner: any;
  let bidder: any;

  beforeEach(async function () {
    [owner, bidder] = await ethers.getSigners();

    // 部署合约
    const PromptNFT = await ethers.getContractFactory("PromptNFT");
    promptNFT = await PromptNFT.deploy();
    
    const ImageNFT = await ethers.getContractFactory("ImageNFT");
    imageNFT = await ImageNFT.deploy(await promptNFT.getAddress());
    
    const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
    auctionFactory = await AuctionFactory.deploy(await imageNFT.getAddress());

    // 创建测试NFT
    await promptNFT.awardItem(owner.address, "QmTestPrompt");
    await imageNFT.awardItem(owner.address, "QmMetadata", "QmTestImage", "QmTestPrompt");
    
    const tokenId = await imageNFT.getTokenIdByCID("QmTestImage");
    
    // 授权并创建拍卖
    await imageNFT.approve(await auctionFactory.getAddress(), tokenId);
    await auctionFactory.createAuction(3600, tokenId); // 1小时拍卖
    
    const auctionAddr = await auctionFactory.getAunctionByTokenId(tokenId);
    await imageNFT.approve(auctionAddr, tokenId);
    
    const DutchAuction = await ethers.getContractFactory("DutchAuction");
    auction = DutchAuction.attach(auctionAddr);
  });

  describe("基础功能", function () {
    it("应该正确创建荷兰拍卖", async function () {
      expect(await auction.getTokenId()).to.be.greaterThan(0);
      expect(await auction.getBeneficiary()).to.equal(owner.address);
      expect(await auction.isEnded()).to.be.false;
      expect(await auction.getEndTime()).to.be.greaterThan(0);
    });

    it("应该随时间降低价格", async function () {
      const startPrice = await auction.getCurrentPrice();
      expect(startPrice).to.equal(ethers.parseEther("1.0")); // 起始价应该是1 ETH
      
      // 前进30分钟
      await ethers.provider.send("evm_increaseTime", [1800]);
      await ethers.provider.send("evm_mine", []);
      
      const midPrice = await auction.getCurrentPrice();
      expect(midPrice).to.be.lessThan(startPrice);
      
      // 前进到结束时间
      await ethers.provider.send("evm_increaseTime", [1800]);
      await ethers.provider.send("evm_mine", []);
      
      const endPrice = await auction.getCurrentPrice();
      expect(endPrice).to.equal(ethers.parseEther("0.1")); // 结束价应该是0.1 ETH
    });
  });

  describe("竞标功能", function () {
    it("应该接受当前价格的出价", async function () {
      const price = await auction.getCurrentPrice();
      
      await expect(auction.connect(bidder).bid({ value: price }))
        .to.emit(auction, "AuctionEnded")
        .withArgs(bidder.address, price);
      
      expect(await auction.getHighestBidder()).to.equal(bidder.address);
      expect(await auction.getWinner()).to.equal(bidder.address);
      expect(await auction.getHighestBid()).to.equal(price);
      expect(await auction.isEnded()).to.be.true;
      
      // 验证NFT所有权转移
      const tokenId = await auction.getTokenId();
      expect(await imageNFT.ownerOf(tokenId)).to.equal(bidder.address);
    });

    it("应该拒绝低于当前价格的出价", async function () {
      const price = await auction.getCurrentPrice();
      const lowBid = price - ethers.parseEther("0.1");
      
      await expect(
        auction.connect(bidder).bid({ value: lowBid })
      ).to.be.revertedWithCustomError(auction, "BidNotHighEnough");
    });

    it("应该退还多余支付", async function () {
      const price = await auction.getCurrentPrice();
      const excessBid = price + ethers.parseEther("0.5");
      
      const balanceBefore = await ethers.provider.getBalance(bidder.address);
      const tx = await auction.connect(bidder).bid({ value: excessBid });
      const receipt = await tx.wait();
      
      // 修复：将 gasUsed 转换为 bigint
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(bidder.address);
      
      // 实际支出应该接近价格（考虑Gas费用）
      const actualSpent = balanceBefore - balanceAfter - BigInt(gasUsed); // 修复：使用 BigInt()
      expect(actualSpent).to.be.closeTo(price, ethers.parseEther("0.01"));
    });

    it("应该阻止拍卖结束后的出价", async function () {
      const price = await auction.getCurrentPrice();
      await auction.connect(bidder).bid({ value: price });
      
      await expect(
        auction.connect(bidder).bid({ value: price })
      ).to.be.revertedWithCustomError(auction, "AuctionAlreadyEnded");
    });
  });

  describe("资金分配", function () {
    it("应该正确分配资金给受益人和组织者", async function () {
      const price = await auction.getCurrentPrice();
      const organizerAddr = await auctionFactory.organizer();
      
      const beneficiaryBefore = await ethers.provider.getBalance(owner.address);
      const organizerBefore = await ethers.provider.getBalance(organizerAddr);
      
      const tx = await auction.connect(bidder).bid({ value: price });
      await tx.wait();
      
      const beneficiaryAfter = await ethers.provider.getBalance(owner.address);
      const organizerAfter = await ethers.provider.getBalance(organizerAddr);
      
      const beneficiaryReceived = beneficiaryAfter - beneficiaryBefore;
      const organizerReceived = organizerAfter - organizerBefore;
      
      // 验证分配比例 (97.5% / 2.5%)
      const expectedBeneficiary = (price * 975n) / 1000n;
      const expectedOrganizer = price - expectedBeneficiary;
      
      expect(beneficiaryReceived).to.be.closeTo(expectedBeneficiary, ethers.parseEther("0.001"));
      expect(organizerReceived).to.be.closeTo(expectedOrganizer, ethers.parseEther("0.001"));
    });
  });

  describe("拍卖结束", function () {
    it("应该允许受益人结束无人出价的拍卖", async function () {
      // 前进到拍卖结束时间之后
      await ethers.provider.send("evm_increaseTime", [4000]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(auction.auctionEnd())
        .to.emit(auction, "AuctionEnded")
        .withArgs(ethers.ZeroAddress, 0);
      
      expect(await auction.isEnded()).to.be.true;
    });

    it("应该阻止非受益人结束拍卖", async function () {
      await expect(
        auction.connect(bidder).auctionEnd()
      ).to.be.revertedWith("only the beneficiary can end the auction");
    });
  });
});