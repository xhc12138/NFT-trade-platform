import { expect } from "chai";
import { ethers } from "hardhat";

describe("NFT Contracts", function () {
  it("Should deploy all contracts", async function () {
    // 部署 PromptNFT
    const PromptNFT = await ethers.getContractFactory("PromptNFT");
    const promptNFT = await PromptNFT.deploy();
    const promptNFTAddress = await promptNFT.getAddress();
    
    // 部署 ImageNFT
    const ImageNFT = await ethers.getContractFactory("ImageNFT");
    const imageNFT = await ImageNFT.deploy(promptNFTAddress);
    const imageNFTAddress = await imageNFT.getAddress();

    // 部署 CreditManagement
    const CreditManagement = await ethers.getContractFactory("CreditManagement");
    const creditManagement = await CreditManagement.deploy();
    const creditManagementAddress = await creditManagement.getAddress();

    // 部署 AuctionFactory
    const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
    const auctionFactory = await AuctionFactory.deploy(imageNFTAddress);
    const auctionFactoryAddress = await auctionFactory.getAddress();

    // 验证合约地址不为空
    expect(promptNFTAddress).to.not.equal(ethers.ZeroAddress);
    expect(imageNFTAddress).to.not.equal(ethers.ZeroAddress);
    expect(creditManagementAddress).to.not.equal(ethers.ZeroAddress);
    expect(auctionFactoryAddress).to.not.equal(ethers.ZeroAddress);
  });
});
