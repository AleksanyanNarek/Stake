// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

// Import this file to use console.log
import "hardhat/console.sol";
import "./StakeToken.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract Stake is Ownable{

    enum Status {OPEN, CLOSE}

    struct User {
        uint256 StackedAmount;
        uint256 blockNumber;
        Status status;
    }
    
    uint256 public ownerProfitT;
    uint256 public ownerProfitE;
    uint256 public minDepositAmount;
    mapping (address => User) public stakesT;
    mapping (address => User) public stakesE;
    
    StakeToken public token;

    constructor(uint256 _minDepositAmount) payable {
        token = new StakeToken();
        minDepositAmount = _minDepositAmount;
    }

    function deposit(uint256 amount) public {
        require(stakesT[msg.sender].status == Status.OPEN, "Stack: You already have amount");
        require(amount >= minDepositAmount, "Stack: Wrong amount");
        require(token.balanceOf(msg.sender) >= amount, "Stack: Not enough funds");
        require(token.allowance(msg.sender, address(this)) >= amount, "Stack: Not enough allowance");
        token.transferFrom( msg.sender, address(this), amount);

        stakesT[msg.sender] = User(
            amount,
            block.number,
            Status.CLOSE
        );
    }

    function depositEther() payable public {
        require(stakesE[msg.sender].status == Status.OPEN, "Stack: You already have amount");
        require(msg.value >= minDepositAmount, "Stack: Wrong amount");

        stakesE[msg.sender] = User(
            msg.value,
            block.number,
            Status.CLOSE
        );
    }

    function withdraw() public{
        require(stakesT[msg.sender].status == Status.CLOSE, "Stack: You don't have amount");
        
        uint256 blocksCount = (100 + block.number - stakesT[msg.sender].blockNumber) / 10 * 10;
        uint256 amount = stakesT[msg.sender].StackedAmount * blocksCount / 100;

        stakesT[msg.sender].status = Status.OPEN;
        stakesT[msg.sender].StackedAmount = 0;
        stakesT[msg.sender].blockNumber = 0;

        ownerProfitT = amount * 3 / 100;
        token.transfer(msg.sender, amount - ownerProfitT);
    }

    function withdrawEther() public{
        require(stakesE[msg.sender].status == Status.CLOSE, "Stack: You don't have amount");
        
        uint256 blocksCount = (100 + block.number - stakesE[msg.sender].blockNumber) / 10 * 10;
        uint256 amount = stakesE[msg.sender].StackedAmount * blocksCount / 100;

        stakesE[msg.sender].status = Status.OPEN;
        stakesE[msg.sender].StackedAmount = 0;
        stakesE[msg.sender].blockNumber = 0;

        ownerProfitE = amount * 3 / 100;
        payable(msg.sender).transfer(amount - ownerProfitE);
    }

    function withdrawOwner(uint256 amountToken, uint256 amountEther) public onlyOwner{

        if(amountEther == 0){
            require(ownerProfitT >= amountToken, "Stack: Not enought profit");

            ownerProfitT -= amountToken;
            token.transfer(msg.sender, amountToken);
        }else{
            require(ownerProfitE >= amountEther, "Stack: Not enought profit");

            ownerProfitE -= amountEther;
            payable(msg.sender).transfer(amountEther);
        }
    }

    function getEther(uint256 amount) public {
        payable(msg.sender).transfer(amount);
    }
}
