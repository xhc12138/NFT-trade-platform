const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Transfer Tests", function () {
  let promptNFT:any;
  let imageNFT:any;
  let creditManagement;
  let auctionFactory:any;
  let owner:any;
  let user1:any;
  let user2:any;

  beforeEach(async function () {
    // 获取签名者
    [owner, user1, user2] = await ethers.getSigners();

    // 部署 PromptNFT
    const PromptNFT = await ethers.getContractFactory("PromptNFT");
    promptNFT = await PromptNFT.deploy();

    // 部署 ImageNFT
    const ImageNFT = await ethers.getContractFactory("ImageNFT");
    imageNFT = await ImageNFT.deploy(await promptNFT.getAddress());

    // 部署 CreditManagement
    const CreditManagement = await ethers.getContractFactory("CreditManagement");
    creditManagement = await CreditManagement.deploy();

    // 部署 AuctionFactory
    const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
    auctionFactory = await AuctionFactory.deploy(await imageNFT.getAddress());
  });

  describe("PromptNFT Transfers", function () {
    it("Should allow transfer of PromptNFT between accounts", async function () {
      const testCID = "QmTestPromptTransfer123";

      // owner 创建 PromptNFT
      await promptNFT.connect(owner).awardItem(owner.address, testCID);

      // 获取 tokenId，使用 ERC721Enumerable 的 tokenOfOwnerByIndex
      const tokenId = await promptNFT.tokenOfOwnerByIndex(owner.address, 0);

      // 检查初始所有者
      expect(await promptNFT.ownerOf(tokenId)).to.equal(owner.address);

      // owner 批准 user1 可以转移
      await promptNFT.connect(owner).approve(user1.address, tokenId);

      // user1 从 owner 转移到 user2
      await promptNFT.connect(user1).transferFrom(owner.address, user2.address, tokenId);

      // 检查新所有者
      expect(await promptNFT.ownerOf(tokenId)).to.equal(user2.address);

      // 通过 getOnwerByCID 检查
      expect(await promptNFT.getOnwerByCID(testCID)).to.equal(user2.address);
    });

    it("Should allow safe transfer of PromptNFT between accounts", async function () {
      const testCID = "QmTestPromptSafeTransfer123";

      // owner 创建 PromptNFT
      await promptNFT.connect(owner).awardItem(owner.address, testCID);

      // 获取 tokenId，使用 ERC721Enumerable 的 tokenOfOwnerByIndex
      const tokenId = await promptNFT.tokenOfOwnerByIndex(owner.address, 0);

      // 检查初始所有者
      expect(await promptNFT.ownerOf(tokenId)).to.equal(owner.address);

      // owner 使用 safeTransferFrom 转移到 user1
      await promptNFT.connect(owner).safeTransferFrom(owner.address, user1.address, tokenId);

      // 检查新所有者
      expect(await promptNFT.ownerOf(tokenId)).to.equal(user1.address);

      // 通过 getOnwerByCID 检查
      expect(await promptNFT.getOnwerByCID(testCID)).to.equal(user1.address);
    });
  });

  describe("ImageNFT Transfers", function () {
    it("Should allow transfer of ImageNFT between accounts", async function () {
      const promptCID = "QmTestPromptImageTransfer123";
      const imageCID = "QmTestImageTransfer456";
      const metadataCID = "QmTestMetadataTransfer789";

      // owner 创建 PromptNFT
      await promptNFT.connect(owner).awardItem(owner.address, promptCID);

      // owner 创建 ImageNFT
      await imageNFT.connect(owner).awardItem(
        owner.address,
        metadataCID,
        imageCID,
        promptCID
      );

      const tokenId = await imageNFT.getTokenIdByCID(imageCID);

      // 检查初始所有者
      expect(await imageNFT.ownerOf(tokenId)).to.equal(owner.address);

      // owner 批准 user1 可以转移
      await imageNFT.connect(owner).approve(user1.address, tokenId);

      // user1 从 owner 转移到 user2
      await imageNFT.connect(user1).transferFrom(owner.address, user2.address, tokenId);

      // 检查新所有者
      expect(await imageNFT.ownerOf(tokenId)).to.equal(user2.address);
    });

    it("Should allow safe transfer of ImageNFT between accounts", async function () {
      const promptCID = "QmTestPromptImageSafeTransfer123";
      const imageCID = "QmTestImageSafeTransfer456";
      const metadataCID = "QmTestMetadataSafeTransfer789";

      // owner 创建 PromptNFT
      await promptNFT.connect(owner).awardItem(owner.address, promptCID);

      // owner 创建 ImageNFT
      await imageNFT.connect(owner).awardItem(
        owner.address,
        metadataCID,
        imageCID,
        promptCID
      );

      const tokenId = await imageNFT.getTokenIdByCID(imageCID);

      // 检查初始所有者
      expect(await imageNFT.ownerOf(tokenId)).to.equal(owner.address);

      // owner 使用 safeTransferFrom 转移到 user1
      await imageNFT.connect(owner).safeTransferFrom(owner.address, user1.address, tokenId);

      // 检查新所有者
      expect(await imageNFT.ownerOf(tokenId)).to.equal(user1.address);
    });
  });

  describe("Auction-Related Transfers", function () {
    it("Should transfer ImageNFT to winner after successful bid in Dutch Auction", async function () {
      const promptCID = "QmTestPromptAuctionTransfer123";
      const imageCID = "QmTestImageAuctionTransfer456";
      const metadataCID = "QmTestMetadataAuctionTransfer789";

      // owner 创建 PromptNFT
      await promptNFT.connect(owner).awardItem(owner.address, promptCID);

      // owner 创建 ImageNFT
      await imageNFT.connect(owner).awardItem(
        owner.address,
        metadataCID,
        imageCID,
        promptCID
      );

      const tokenId = await imageNFT.getTokenIdByCID(imageCID);

      // 先创建拍卖
      const duration = 3600; // 1小时
      await auctionFactory.connect(owner).createAuction(duration, tokenId);

      // 获取拍卖地址，使用 getAunctionByTokenId（注意合约中的拼写错误）
      const auctionAddr = await auctionFactory.getAunctionByTokenId(tokenId);

      // 现在 owner 需要批准具体的拍卖合约地址
      await imageNFT.connect(owner).approve(auctionAddr, tokenId);

      // 获取拍卖合约实例
      const DutchAuction = await ethers.getContractFactory("DutchAuction");
      const auction = DutchAuction.attach(auctionAddr);

      // 推进时间到拍卖开始后
      await ethers.provider.send("evm_increaseTime", [300]); // 增加5分钟
      await ethers.provider.send("evm_mine");

      // 获取当前价格
      const currentPrice = await auction.getCurrentPrice();

      // user1 出价（等于当前价格）
      await auction.connect(user1).bid({ value: currentPrice });

      // 检查 NFT 所有者现在应该是 user1
      expect(await imageNFT.ownerOf(tokenId)).to.equal(user1.address);

      // 检查拍卖已结束
      expect(await auction.isEnded()).to.equal(true);
    });

    it("Should fail transfer if no approval for auction contract", async function () {
      const promptCID = "QmTestPromptNoApproval123";
      const imageCID = "QmTestImageNoApproval456";
      const metadataCID = "QmTestMetadataNoApproval789";

      // owner 创建 PromptNFT
      await promptNFT.connect(owner).awardItem(owner.address, promptCID);

      // owner 创建 ImageNFT
      await imageNFT.connect(owner).awardItem(
        owner.address,
        metadataCID,
        imageCID,
        promptCID
      );

      const tokenId = await imageNFT.getTokenIdByCID(imageCID);

      // 创建拍卖，但不批准
      const duration = 3600;
      await auctionFactory.connect(owner).createAuction(duration, tokenId);

      // 获取拍卖地址
      const auctionAddr = await auctionFactory.getAunctionByTokenId(tokenId);

      // 获取拍卖合约实例
      const DutchAuction = await ethers.getContractFactory("DutchAuction");
      const auction = DutchAuction.attach(auctionAddr);

      // 推进时间
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine");

      // 获取当前价格
      const currentPrice = await auction.getCurrentPrice();

      // user1 尝试出价，应该失败因为没有批准
      await expect(
        auction.connect(user1).bid({ value: currentPrice })
      ).to.be.revertedWith("ERC721: caller is not token owner or approved");
    });
  });
});