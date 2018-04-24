pragma solidity ^0.4.21;

import "./zeppelin/SafeMath.sol";
import "./zeppelin/Ownable.sol";

contract RefundContract is Ownable {
    using SafeMath for uint256;

    mapping(address => uint256) public deposited;
    mapping(address => uint256) public depositedTime;

    bool public withdrawing;
    address public wallet;
    uint256 public lastDepositedTime;

    event Deposit(address indexed customer, uint256 value);
    event Refund(address indexed customer, uint256 value);
    event Withdraw(address wallet, uint256 value);

    function RefundContract(address _wallet) public {
      require(_wallet != address(0));
      wallet = _wallet;
      withdrawing = false;
    }

    function deposit() public payable {
        require(!withdrawing);
        require(deposited[msg.sender] == 0);
        deposited[msg.sender] = msg.value;
        depositedTime[msg.sender] = block.timestamp;
        lastDepositedTime = block.timestamp;
        emit Deposit(msg.sender, msg.value);
    }

    function getRefund() public {
        require(deposited[msg.sender] != 0);
        require(block.timestamp <= depositedTime[msg.sender].add(1 weeks));
        uint256 depositedValue = deposited[msg.sender];
        deposited[msg.sender] = 0;
        msg.sender.transfer(depositedValue);
        emit Refund(msg.sender, depositedValue);
    }

    function enableWithdraw() onlyOwner public {
      require(!withdrawing);
      withdrawing = true;
    }

    function withdraw() onlyOwner public {
      require(withdrawing);
      require(block.timestamp > lastDepositedTime.add(1 weeks));
      wallet.transfer(address(this).balance);
      emit Withdraw(wallet, address(this).balance);
    }

    function isMember(address _customer) public view returns (bool) {
      return deposited[_customer] != 0;
    }
}