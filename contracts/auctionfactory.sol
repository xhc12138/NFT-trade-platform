// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { DutchAuction } from './auction.sol';

contract AuctionFactory {
    address[] public auctions;
    address payable public organizer;
    address imgContractAddress;
    mapping(uint256 => address) public tokenIdToAuction;

    event AuctionCreated(address indexed auctionAddress);

    constructor(address _imgContractAddress) {
        organizer = payable(msg.sender);
        imgContractAddress = _imgContractAddress;
    }    

    // 保持接口完全不变！前端不需要任何修改
    function createAuction(uint duration, uint256 tokenId) public returns (address) {
        address auctionAddr = tokenIdToAuction[tokenId];

        // 检查该NFT是否已在拍卖中
        if (auctionAddr != address(0)) {
            // 修复：避免直接类型转换，使用接口模式
            DutchAuction auction = DutchAuction(auctionAddr);
            require(auction.isEnded(), "this token is already in an auction");
        }
        
        // 创建荷兰拍卖（使用原有参数）
        DutchAuction newAuction = new DutchAuction(
            duration,
            payable(msg.sender),
            tokenId,
            organizer,
            imgContractAddress
        );

        address newAuctionAddr = address(newAuction);
        emit AuctionCreated(newAuctionAddr);
        auctions.push(newAuctionAddr);
        tokenIdToAuction[tokenId] = newAuctionAddr;
        return newAuctionAddr;
    }

    // 以下接口全部保持不变
    function getAunctionByTokenId(uint256 tokenId) public view returns (address) {
        return tokenIdToAuction[tokenId];
    }

    function getAuctionByIndex(uint index) public view returns (address) {
        require(index < auctions.length, "Index out of bounds");
        return auctions[index];
    }

    function allAuctions() public view returns (address[] memory) {
        return auctions;
    }
}