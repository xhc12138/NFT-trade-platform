import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { NETWORK } from "./config/contracts";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// deploy-local.json 的类型
type DeployConfig = {
  network?: string;
  owner?: string;
  promptNFT: string;
  imageNFT: string;
  auctionFactory: string;
  auction: string;   // DutchAuction 地址
  tokenId: string;   // 字符串形式的 tokenId
  cids?: {
    promptCid?: string;
    metaCid?: string;
    imgCid?: string;
  };
};

// 精简版 AuctionFactory ABI（目前没用到，但保留）
const AUCTION_FACTORY_ABI = [
  "function getAunctionByTokenId(uint256 tokenId) view returns (address)",
  "function getAuctionByIndex(uint256 index) view returns (address)",
  "function allAuctions() view returns (address[])"
];

// 精简版 DutchAuction ABI
const DUTCH_AUCTION_ABI = [
  "function getCurrentPrice() view returns (uint256)",
  "function getEndTime() view returns (uint256)",
  "function getWinner() view returns (address)",
  "function isEnded() view returns (bool)",
  "function bid() payable",
  "function getTokenId() view returns (uint256)"
];

type AuctionInfo = {
  address: string;
  tokenId: bigint;
  currentPrice: bigint;
  endTime: bigint;
  winner: string;
  isEnded: boolean;
};

const App: React.FC = () => {
  const [rpcProvider, setRpcProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>("");

  const [status, setStatus] = useState<string>("Not connected");
  const [tokenIdInput, setTokenIdInput] = useState<string>("1");

  const [deployConfig, setDeployConfig] = useState<DeployConfig | null>(null);
  const [auctionAddress, setAuctionAddress] = useState<string>("");
  const [auctionInfo, setAuctionInfo] = useState<AuctionInfo | null>(null);
  const [loadingAuction, setLoadingAuction] = useState<boolean>(false);
  const [bidding, setBidding] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      // 1. 读数据统一走本地 Hardhat 节点
      const p = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
      setRpcProvider(p);
      setStatus("Using Hardhat JsonRpcProvider for reading.");

      // 2. 自动加载 deploy-local.json
      try {
        const res = await fetch("/deploy-local.json?ts=" + Date.now());
        if (!res.ok) {
          console.warn("deploy-local.json not found or HTTP error:", res.status);
          return;
        }
        const json = (await res.json()) as DeployConfig;
        console.log("Loaded deploy-local.json:", json);
        setDeployConfig(json);

        if (json.tokenId) {
          setTokenIdInput(String(json.tokenId));
        }
      } catch (e) {
        console.error("Failed to load deploy-local.json:", e);
      }
    };
    init();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask first.");
      return;
    }

    try {
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts"
      });

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const s = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();

      if (network.chainId !== BigInt(NETWORK.chainId)) {
        alert(`Please switch MetaMask to Hardhat network (chainId ${NETWORK.chainId}).`);
      }

      setSigner(s);
      setAccount(accounts[0]);
      setStatus(`Connected as ${accounts[0]}`);
    } catch (err: any) {
      console.error(err);
      alert("Failed to connect wallet");
    }
  };

  const loadAuction = async () => {
    if (!rpcProvider) {
      alert("RPC Provider not ready.");
      return;
    }

    if (!deployConfig || !deployConfig.auction) {
      alert("deploy-local.json 未加载或缺少 auction 字段，请先运行一键部署脚本。");
      return;
    }

    try {
      setLoadingAuction(true);
      setAuctionInfo(null);

      const auctionAddr = deployConfig.auction;
      setAuctionAddress(auctionAddr);

      const auction = new ethers.Contract(
        auctionAddr,
        DUTCH_AUCTION_ABI,
        rpcProvider
      );

      const [price, endTime, winner, isEnded, tokenId] = await Promise.all([
        auction.getCurrentPrice(),
        auction.getEndTime(),
        auction.getWinner(),
        auction.isEnded(),
        auction.getTokenId()
      ]);

      setAuctionInfo({
        address: auctionAddr,
        tokenId,
        currentPrice: price,
        endTime,
        winner,
        isEnded
      });
    } catch (err) {
      console.error("LOAD AUCTION ERROR:", err);
      alert("Failed to load auction.");
    } finally {
      setLoadingAuction(false);
    }
  };

  const handleBid = async () => {
    if (!signer) {
      alert("Please connect MetaMask first.");
      return;
    }
    if (!auctionAddress || !auctionInfo) {
      alert("Please load auction first.");
      return;
    }

    try {
      setBidding(true);

      const auctionWithSigner = new ethers.Contract(
        auctionAddress,
        DUTCH_AUCTION_ABI,
        signer
      );

      // 直接使用 loadAuction 时读取到的价格
      const currentPrice: bigint = auctionInfo.currentPrice;

      const tx = await auctionWithSigner.bid({
        value: currentPrice
      });
      setStatus("Sending bid transaction...");
      await tx.wait();
      setStatus("Bid success!");

      // 重新加载拍卖信息
      await loadAuction();
    } catch (err: any) {
      console.error(err);
      alert(err?.reason || err?.message || "Bid failed.");
    } finally {
      setBidding(false);
    }
  };

  const formatEth = (wei: bigint) => {
    return Number(ethers.formatEther(wei)).toFixed(4);
  };

  const formatTime = (ts: bigint) => {
    const n = Number(ts);
    if (!n) return "-";
    const d = new Date(n * 1000);
    return d.toLocaleString();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#0f172a",
        color: "#e5e7eb"
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
        Dutch Auction Frontend (Hardhat Local)
      </h1>
      <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "16px" }}>
        Network: {NETWORK.name} ({NETWORK.rpcUrl})
      </p>

      {deployConfig ? (
        <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "12px" }}>
          Loaded config from <code>deploy-local.json</code> — tokenId:{" "}
          {deployConfig.tokenId}, auction: {deployConfig.auction}
        </p>
      ) : (
        <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "12px" }}>
          deploy-local.json not loaded yet. 请确认已运行一键部署脚本并将文件放到前端根目录。
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          marginBottom: "24px"
        }}
      >
        <button
          onClick={connectWallet}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            border: "none",
            background: "#4f46e5",
            color: "white",
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          {account ? "Connected" : "Connect MetaMask"}
        </button>
        <span style={{ fontSize: "13px", opacity: 0.8 }}>{status}</span>
      </div>

      <div
        style={{
          background: "#020617",
          borderRadius: "16px",
          padding: "16px",
          maxWidth: "520px",
          marginBottom: "24px",
          border: "1px solid #1f2937"
        }}
      >
        <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>
          Load Auction
        </h2>
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "12px"
          }}
        >
          <input
            value={tokenIdInput}
            onChange={(e) => setTokenIdInput(e.target.value)}
            placeholder="tokenId (from deploy-local.json)"
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #374151",
              background: "#020617",
              color: "white"
            }}
          />
          <button
            onClick={loadAuction}
            disabled={loadingAuction}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "none",
              background: loadingAuction ? "#4b5563" : "#10b981",
              color: "white",
              cursor: loadingAuction ? "default" : "pointer",
              fontWeight: 500
            }}
          >
            {loadingAuction ? "Loading..." : "Load"}
          </button>
        </div>

        <p style={{ fontSize: "12px", opacity: 0.7 }}>
          当前前端会直接使用 <code>deploy-local.json</code> 中的{" "}
          <strong>auction</strong> 地址加载荷兰拍卖。
        </p>
      </div>

      {auctionAddress && auctionInfo && (
        <div
          style={{
            background: "#020617",
            borderRadius: "16px",
            padding: "16px",
            maxWidth: "520px",
            border: "1px solid #1f2937"
          }}
        >
          <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>
            Auction Detail
          </h2>
          <div style={{ fontSize: "13px", marginBottom: "8px" }}>
            <div>
              <strong>Token ID:</strong> {auctionInfo.tokenId.toString()}
            </div>
            <div>
              <strong>Auction Address:</strong> {auctionAddress}
            </div>
            <div>
              <strong>Current Price:</strong> {formatEth(auctionInfo.currentPrice)} ETH
            </div>
            <div>
              <strong>End Time:</strong> {formatTime(auctionInfo.endTime)}
            </div>
            <div>
              <strong>Is Ended:</strong> {auctionInfo.isEnded ? "Yes" : "No"}
            </div>
            <div>
              <strong>Winner:</strong>{" "}
              {auctionInfo.winner === ethers.ZeroAddress
                ? "None"
                : auctionInfo.winner}
            </div>
          </div>

          <button
            onClick={handleBid}
            disabled={bidding || auctionInfo.isEnded}
            style={{
              marginTop: "12px",
              padding: "10px 16px",
              borderRadius: "999px",
              border: "none",
              background:
                bidding || auctionInfo.isEnded ? "#4b5563" : "#f97316",
              color: "white",
              cursor: bidding || auctionInfo.isEnded ? "default" : "pointer",
              fontWeight: 600
            }}
          >
            {auctionInfo.isEnded
              ? "Auction Ended"
              : bidding
              ? "Bidding..."
              : `Bid at current price (${formatEth(
                  auctionInfo.currentPrice
                )} ETH)`}
          </button>
          <p style={{ fontSize: "12px", opacity: 0.7, marginTop: "6px" }}>
            调用 <code>auction.bid()</code>，<code>value</code> 为当前拍卖价格。
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
