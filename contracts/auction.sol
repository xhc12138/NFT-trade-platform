// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./imagenft.sol";

contract DutchAuction {
    ImageNFT public imgContract;

    // 保持原有状态变量名称以兼容接口
    uint public auctionEndTime;
    address payable public beneficiary;
    uint256 public tokenId;
    address payable public organizer;

    // 荷兰拍卖特有变量
    uint public auctionStartTime;
    uint public startingPrice;
    uint public endingPrice;
    uint public priceDecrement;
    uint public decrementInterval;

    // 保持原有状态变量名称
    address public highestBidder;
    uint public highestBid;
    bool ended;

    // 保持原有事件
    event HighestBidIncreased(address bidder, uint amount);
    event AuctionEnded(address winner, uint amount);

    // 保持原有错误类型
    error AuctionAlreadyEnded();
    error BidNotHighEnough(uint highestBid);
    error AuctionNotYetEnded();
    error AuctionEndAlreadyCalled();

    constructor(
        uint biddingTime,           // 保持参数名不变
        address payable beneficiaryAddress,
        uint256 _tokenId,
        address payable _organizer,
        address contractAddress
    ) {
        // 设置荷兰拍卖参数（使用合理的默认值）
        auctionStartTime = block.timestamp;
        auctionEndTime = block.timestamp + biddingTime;
        startingPrice = 1 ether;    // 默认起始价 1 ETH
        endingPrice = 0.1 ether;    // 默认结束价 0.1 ETH
        decrementInterval = 300;    // 每5分钟降价一次
        
        // 计算价格下降幅度
        uint totalDecrements = biddingTime / decrementInterval;
        require(totalDecrements > 0, "Duration too short for decrements");
        priceDecrement = (startingPrice - endingPrice) / totalDecrements;

        beneficiary = beneficiaryAddress;
        organizer = _organizer;
        tokenId = _tokenId;
        imgContract = ImageNFT(contractAddress);
    }

    /// @notice 获取当前价格（荷兰拍卖核心逻辑）
    function getCurrentPrice() public view returns (uint) {
        if (ended) return highestBid;
        if (block.timestamp >= auctionEndTime) return endingPrice;
        
        uint timeElapsed = block.timestamp - auctionStartTime;
        uint decrements = timeElapsed / decrementInterval;
        uint totalDecrease = priceDecrement * decrements;
        
        if (totalDecrease >= startingPrice - endingPrice) {
            return endingPrice;
        }
        
        return startingPrice - totalDecrease;
    }

    // 保持原有接口函数
    function getEndTime() public view returns (uint) {
        return auctionEndTime;
    }

    function getHighestBidder() public view returns (address) {
        return highestBidder;
    }

    // 添加 getWinner 函数以兼容测试
    function getWinner() public view returns (address) {
        return highestBidder;
    }

    function getHighestBid() public view returns (uint) {
        return highestBid;
    }

    function getBeneficiary() public view returns (address) {
        return beneficiary;
    }

    function getTokenId() public view returns (uint256) {
        return tokenId;
    }

    function isEnded() public view returns (bool) {
        return ended;
    }

    // 为了接口兼容性，保留这个函数（在荷兰拍卖中可能不需要）
    function getPendingReturns(address addr) public view returns (uint) {
        return 0; // 荷兰拍卖没有待退款
    }

    /// @notice 出价函数 - 接口保持不变，内部逻辑改为荷兰拍卖
    function bid() external payable {
        if (block.timestamp >= auctionEndTime) revert AuctionAlreadyEnded();
        if (ended) revert AuctionAlreadyEnded();

        uint currentPrice = getCurrentPrice();
        if (msg.value < currentPrice) revert BidNotHighEnough(currentPrice);

        // 设置获胜者
        highestBidder = msg.sender;
        highestBid = currentPrice;
        ended = true;

        // 转移NFT
        imgContract.transferFrom(beneficiary, highestBidder, tokenId);

        // 分配资金（保持原有比例）
        uint beneficiaryTransfer = (highestBid * 975) / 1000;
        uint organizerTransfer = highestBid - beneficiaryTransfer;
        
        // 使用 call 而不是 transfer 以避免 Gas 限制问题
        (bool success1, ) = beneficiary.call{value: beneficiaryTransfer}("");
        (bool success2, ) = organizer.call{value: organizerTransfer}("");
        
        require(success1 && success2, "Transfer failed");

        // 退还多余资金
        uint refund = msg.value - highestBid;
        if (refund > 0) {
            (bool success3, ) = payable(msg.sender).call{value: refund}("");
            require(success3, "Refund failed");
        }

        emit HighestBidIncreased(msg.sender, highestBid);
        emit AuctionEnded(highestBidder, highestBid);
    }

    /// @notice 为了接口兼容性保留，但在荷兰拍卖中可能不需要
    function withdraw() external returns (bool) {
        // 荷兰拍卖没有待退款机制，直接返回成功
        return true;
    }

    /// @notice 结束拍卖 - 接口保持不变
    function auctionEnd() external {
        require(msg.sender == beneficiary, "only the beneficiary can end the auction");

        if (block.timestamp < auctionEndTime) revert AuctionNotYetEnded();
        if (ended) revert AuctionEndAlreadyCalled();

        // 如果拍卖时间结束但无人出价，标记为结束
        ended = true;
        emit AuctionEnded(highestBidder, highestBid);
    }
}