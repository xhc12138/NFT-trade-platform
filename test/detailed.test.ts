import { expect } from "chai";
import { ethers } from "hardhat";

describe("NFT Contracts Detailed Tests", function () {
  let promptNFT: any;
  let imageNFT: any;
  let creditManagement: any;
  let auctionFactory: any;
  let owner: any;
  let user1: any;

  beforeEach(async function () {
    // 获取签名者
    [owner, user1] = await ethers.getSigners();

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

  describe("PromptNFT", function () {
    it("Should create a new PromptNFT", async function () {
      const testCID = "QmTestPrompt123";
      
      await promptNFT.awardItem(owner.address, testCID);
      
      const nftOwner = await promptNFT.getOnwerByCID(testCID);
      expect(nftOwner).to.equal(owner.address);
    });

    it("Should prevent duplicate PromptNFT creation", async function () {
      const testCID = "QmTestPrompt123";
      
      await promptNFT.awardItem(owner.address, testCID);
      
      // 尝试用相同CID再次创建应该失败
      await expect(
        promptNFT.awardItem(user1.address, testCID)
      ).to.be.revertedWith("prompt already exists");
    });
  });

  describe("ImageNFT", function () {
    it("Should create ImageNFT with valid prompt ownership", async function () {
      const promptCID = "QmTestPrompt123";
      const imageCID = "QmTestImage456";
      const metadataCID = "QmTestMetadata789";
      
      // 先创建PromptNFT
      await promptNFT.awardItem(owner.address, promptCID);
      
      // 然后创建ImageNFT
      await imageNFT.awardItem(
        owner.address,
        metadataCID,
        imageCID,
        promptCID
      );
      
      const tokenId = await imageNFT.getTokenIdByCID(imageCID);
      expect(tokenId).to.be.greaterThan(0);
    });

    it("Should prevent ImageNFT creation without prompt ownership", async function () {
      const promptCID = "QmTestPrompt123";
      const imageCID = "QmTestImage456";
      const metadataCID = "QmTestMetadata789";
      
      // user1 创建PromptNFT
      await promptNFT.awardItem(user1.address, promptCID);
      
      // owner 尝试使用不属于自己的Prompt创建ImageNFT应该失败
      await expect(
        imageNFT.awardItem(
          owner.address,
          metadataCID,
          imageCID,
          promptCID
        )
      ).to.be.revertedWith("you are not the owner of the prompt");
    });
  });

  describe("CreditManagement", function () {
    it("Should allow claiming free credits", async function () {
      await creditManagement.connect(owner).updateCredits();
      
      const credits = await creditManagement.getCredits();
      expect(credits).to.equal(100);
    });

    it("Should allow purchasing credits", async function () {
      const creditPrice = ethers.parseEther("0.0003");
      
      await creditManagement.connect(owner).purchaseCredits({
        value: creditPrice
      });
      
      const credits = await creditManagement.getCredits();
      expect(credits).to.equal(100);
    });
  });

  describe("AuctionFactory", function () {
    it("Should create new auction", async function () {
      // 先创建必要的NFT
      const promptCID = "QmTestPrompt123";
      const imageCID = "QmTestImage456";
      const metadataCID = "QmTestMetadata789";
      
      await promptNFT.awardItem(owner.address, promptCID);
      await imageNFT.awardItem(owner.address, metadataCID, imageCID, promptCID);
      
      const tokenId = await imageNFT.getTokenIdByCID(imageCID);
      
      // 创建拍卖
      const duration = 3600; // 1小时
      await auctionFactory.createAuction(duration, tokenId);
      
      const auctionAddr = await auctionFactory.getAunctionByTokenId(tokenId);
      expect(auctionAddr).to.not.equal(ethers.ZeroAddress);
    });
  });
});
