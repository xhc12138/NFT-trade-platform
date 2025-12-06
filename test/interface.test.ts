// test/interface-compatibility.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Interface Compatibility Tests", function () {
  let auction: any;
  let auctionFactory: any;
  let imageNFT: any;
  let promptNFT: any;

  beforeEach(async function () {
    const [owner] = await ethers.getSigners();

    // 部署合约
    const PromptNFT = await ethers.getContractFactory("PromptNFT");
    promptNFT = await PromptNFT.deploy();
    
    const ImageNFT = await ethers.getContractFactory("ImageNFT");
    imageNFT = await ImageNFT.deploy(await promptNFT.getAddress());
    
    const AuctionFactoryContract = await ethers.getContractFactory("AuctionFactory");
    auctionFactory = await AuctionFactoryContract.deploy(await imageNFT.getAddress());

    // 创建测试NFT和拍卖
    await promptNFT.awardItem(owner.address, "QmTest");
    await imageNFT.awardItem(owner.address, "QmMeta", "QmImage", "QmTest");
    
    const tokenId = await imageNFT.getTokenIdByCID("QmImage");
    await imageNFT.approve(await auctionFactory.getAddress(), tokenId);
    await auctionFactory.createAuction(3600, tokenId);
    
    const auctionAddr = await auctionFactory.getAunctionByTokenId(tokenId);
    const DutchAuctionContract = await ethers.getContractFactory("DutchAuction");
    auction = await DutchAuctionContract.attach(auctionAddr);
  });

  it("应该保持所有公共接口", async function () {
    // 检查所有必要的view函数
    expect(await auction.getEndTime()).to.be.a('bigint');
    expect(await auction.getHighestBidder()).to.be.a('string');
    expect(await auction.getHighestBid()).to.be.a('bigint');
    expect(await auction.getBeneficiary()).to.be.a('string');
    expect(await auction.getTokenId()).to.be.a('bigint');
    expect(await auction.isEnded()).to.be.a('boolean');
    expect(await auction.getPendingReturns(ethers.ZeroAddress)).to.be.a('bigint');
  });

  it("应该支持原有的拍卖创建接口", async function () {
    const auctions = await auctionFactory.allAuctions();
    expect(auctions.length).to.equal(1);
    
    const auctionByToken = await auctionFactory.getAunctionByTokenId(1);
    expect(auctionByToken).to.not.equal(ethers.ZeroAddress);
  });
});