// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  console.log("开始部署智能合约...");

  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 1. 部署 PromptNFT
  console.log("正在部署 PromptNFT...");
  const PromptNFT = await ethers.getContractFactory("PromptNFT");
  const promptNFT = await PromptNFT.deploy();
  const promptNFTAddress = await promptNFT.getAddress();
  console.log("PromptNFT 部署到:", promptNFTAddress);

  // 2. 部署 ImageNFT
  console.log("正在部署 ImageNFT...");
  const ImageNFT = await ethers.getContractFactory("ImageNFT");
  const imageNFT = await ImageNFT.deploy(promptNFTAddress);
  const imageNFTAddress = await imageNFT.getAddress();
  console.log("ImageNFT 部署到:", imageNFTAddress);

  // 3. 部署 CreditManagement
  console.log("正在部署 CreditManagement...");
  const CreditManagement = await ethers.getContractFactory("CreditManagement");
  const creditManagement = await CreditManagement.deploy();
  const creditManagementAddress = await creditManagement.getAddress();
  console.log("CreditManagement 部署到:", creditManagementAddress);

  // 4. 部署 AuctionFactory（荷兰式拍卖版本）
  console.log("正在部署 AuctionFactory（荷兰式拍卖）...");
  const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
  const auctionFactory = await AuctionFactory.deploy(imageNFTAddress);
  const auctionFactoryAddress = await auctionFactory.getAddress();
  console.log("AuctionFactory 部署到:", auctionFactoryAddress);

  console.log("\n=== 部署完成 ===");
  console.log("PromptNFT:", promptNFTAddress);
  console.log("ImageNFT:", imageNFTAddress);
  console.log("CreditManagement:", creditManagementAddress);
  console.log("AuctionFactory:", auctionFactoryAddress);

  // 保存合约地址到文件
  const fs = require('fs');
  const contracts = {
    promptNFT: promptNFTAddress,
    imageNFT: imageNFTAddress,
    creditManagement: creditManagementAddress,
    auctionFactory: auctionFactoryAddress
  };
  
  fs.writeFileSync('deployed-addresses.json', JSON.stringify(contracts, null, 2));
  console.log("合约地址已保存到 deployed-addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});