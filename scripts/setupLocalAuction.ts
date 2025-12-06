// scripts/setupLocalAuction.ts
import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Deployer (owner):", owner.address);

  // 1. 部署 PromptNFT
  const PromptNFT = await ethers.getContractFactory("PromptNFT");
  const promptNFT = await PromptNFT.deploy();
  await promptNFT.waitForDeployment();
  const promptAddr = await promptNFT.getAddress();
  console.log("PromptNFT:", promptAddr);

  // 2. 部署 ImageNFT（构造参数是 PromptNFT 地址）
  const ImageNFT = await ethers.getContractFactory("ImageNFT");
  const imageNFT = await ImageNFT.deploy(promptAddr);
  await imageNFT.waitForDeployment();
  const imageAddr = await imageNFT.getAddress();
  console.log("ImageNFT:", imageAddr);

  // 3. 部署 AuctionFactory（构造参数是 ImageNFT 地址）
  const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
  const auctionFactory = await AuctionFactory.deploy(imageAddr);
  await auctionFactory.waitForDeployment();
  const factoryAddr = await auctionFactory.getAddress();
  console.log("AuctionFactory:", factoryAddr);

  // ====== 下面开始：一键创建一场拍卖 ======

  // 4. 生成“不会重复”的 CID，避免 prompt already exists / artwork already exists
  const now = Date.now();
  const promptCid = `QmPrompt_${now}`;
  const metaCid   = `QmMeta_${now}`;
  const imgCid    = `QmImg_${now}`;

  console.log("\nMinting NFTs...");
  // 4.1 铸造 PromptNFT
  await (await promptNFT.awardItem(owner.address, promptCid)).wait();

  // 4.2 铸造 ImageNFT（带 metadataCID / imageCID / promptCID）
  await (await imageNFT.awardItem(owner.address, metaCid, imgCid, promptCid)).wait();

  // 5. 查询刚刚那张图的 tokenId
  const tokenId = await imageNFT.getTokenIdByCID(imgCid);
  console.log("Minted ImageNFT tokenId:", tokenId.toString());

  // 6. 创建一场荷兰拍卖（持续 3600 秒 = 1 小时）
  const createTx = await auctionFactory.createAuction(3600, tokenId);
  await createTx.wait();
  console.log("Created Dutch auction with duration = 3600s");

  // 7. 从 factory 里查到 DutchAuction 的地址
  const auctionAddr = await auctionFactory.getAunctionByTokenId(tokenId);
  console.log("DutchAuction address:", auctionAddr);

  // 8. 允许 DutchAuction 代扣这张 NFT（关键修复：approve 给 auctionAddr，而非 factory）
  await (await imageNFT.approve(auctionAddr, tokenId)).wait();
  console.log("Approved DutchAuction to transfer tokenId", tokenId.toString());

  // 9. 验证 approve（可选，但推荐添加日志）
  const approvedAddr = await imageNFT.getApproved(tokenId);
  console.log("Current approved address for tokenId", tokenId.toString(), ":", approvedAddr);
  if (approvedAddr.toLowerCase() !== auctionAddr.toLowerCase()) {
    throw new Error("Approve failed: wrong approved address");
  }
  const ownerOf = await imageNFT.ownerOf(tokenId);
  console.log("NFT owner:", ownerOf);
  if (ownerOf.toLowerCase() !== owner.address.toLowerCase()) {
    throw new Error("Mint failed: wrong owner");
  }

  // 10. 把结果写到本地 JSON 文件，给前端用
  const out = {
    network: "localhost",
    owner: owner.address,
    promptNFT: promptAddr,
    imageNFT: imageAddr,
    auctionFactory: factoryAddr,
    auction: auctionAddr,
    tokenId: tokenId.toString(),
    cids: {
      promptCid,
      metaCid,
      imgCid,
    },
  };

  fs.writeFileSync("deploy-local.json", JSON.stringify(out, null, 2));
  console.log('\n✅ All done. Saved to deploy-local.json');
  console.log(out);
}

// 标准 Hardhat 脚本入口
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});