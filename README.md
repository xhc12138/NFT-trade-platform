# NFT-trade-platform
This is a class project for MSBD5017 HKUST, mainly focus on the application of prompt &amp; AI_GEN NFT
# Full Deployment Workflow

* **Contract Project**: `~/nft-contracts` (contains `hardhat.config.ts`, `scripts/setupLocalAuction.ts`, etc.)
* **Frontend Project**: `~/nft-contracts/frontend-hardhat`

---

## Steps After Each Boot

### Step 1: Start the Hardhat Local Chain (Must Keep Running)

**Terminal 1:**

```bash
cd ~/nft-contracts
npx hardhat node
```

You should see something like:

```text
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

This indicates the local chain is ready. Do not close this terminal.

---

### Step 2: One-Click Deploy Contracts + Create Auction

**Open Terminal 2:**

```bash
cd ~/nft-contracts
npx hardhat run scripts/setupLocalAuction.ts --network localhost
```

This step will:

* Redeploy PromptNFT / ImageNFT / AuctionFactory
* Automatically mint a set of NFTs
* Automatically approve + createAuction
* Generate/overwrite `deploy-local.json` in the current directory

The terminal will print:

* Contract addresses
* DutchAuction address
* Token ID and other information

---

### Step 3: Copy `deploy-local.json` to the Frontend Root Directory

Still in **Terminal 2** (adjust based on your actual path):

```bash
cp deploy-local.json frontend-hardhat/deploy-local.json
```

If the frontend project is not in a subdirectory, modify to the corresponding path, e.g.:

```bash
cp deploy-local.json ../frontend-hardhat/deploy-local.json
```

Ensure the file is visible in the frontend project root directory:

```bash
ls frontend-hardhat/deploy-local.json
```

---

### Step 4: Start the Frontend (Vite)

**Open Terminal 3:**

```bash
cd ~/nft-contracts/frontend-hardhat
npm run dev
```

This will start a frontend server at `http://localhost:5173` by default.

> After running `npm install` the first time, you don't need to reinstall dependencies after restarting your computer.

---

### Step 5: Check MetaMask (Usually No Need to Change)

1. Open `http://localhost:5173` in your browser.
2. Confirm MetaMask:

   * Network selected: **Hardhat Localhost**
   * Network configuration:

     * RPC URL: `http://127.0.0.1:8545`
     * Chain ID: `31337`
   * Account is the one imported with the private key:
     `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
     (Address: `0xf39F…`)

These settings only need to be configured once; MetaMask will remember them after restarting the browser/computer.

---

### Step 6: Operations in the Frontend

1. Click **Connect** on the page (connect MetaMask).
2. It will display:
   `Loaded config from deploy-local.json — tokenId: 1, auction: 0x....`
3. Click **Load**
   You will see:

   * Token ID
   * Auction Address
   * Current Price
   * End Time
   * Winner and other information
4. Directly click **Bid at current price (...) ETH**
   This will place a bid on this auction using the current MetaMask account.

---

## Remember This for Every Restart:

> **"First `npx hardhat node`, then `setupLocalAuction`, copy JSON, then `npm run dev`."**
