import { increaseTime, duration } from './helpers/increaseTime';
import { advanceBlock } from './helpers/advanceBlock';
import { getTransactionGasCost } from './helpers/getGasCost';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Refund = artifacts.require("RefundContract");

contract('Refund', ([owner, depositor, nonDepositor, wallet]) => {
  const value = new web3.BigNumber(web3.toWei(0.001, 'ether'));
  let refund;

  before(async () => {
    await advanceBlock();
  });

  beforeEach(async () => {
    refund = await Refund.new(wallet, { from: owner });
  })

  it("deposits ETH", async () => {
    await refund.deposit({ value, from: depositor });
    await web3.eth.getBalance(refund.address).should.be.bignumber.equal(value);
  });

  it("fails trying to deposit again", async () => {
    await refund.deposit({ value, from: depositor }).should.be.fulfilled;
    await refund.deposit({ value, from: depositor}).should.be.rejectedWith('revert');
  })

  it("fails trying to deposit after closing", async () => {
    await refund.enableWithdraw({ from: owner });
    await refund.deposit({ value, from: depositor }).should.be.rejectedWith('revert');
  })

  it("should accept getting refund before passing one week", async () => {
    await refund.deposit({ value, from: depositor });
    await increaseTime(duration.days(1));
    const pre = web3.eth.getBalance(depositor);
    const res = await refund.getRefund({ from: depositor });
    const post = web3.eth.getBalance(depositor);
    const gasCost = getTransactionGasCost(res["tx"])
    post.minus(pre).plus(gasCost).should.be.bignumber.equal(value);
  })

  it("should reject getting refund after passing one week", async () => {
    await refund.deposit({ value, from: depositor });
    await increaseTime(duration.weeks(1.1));
    await refund.getRefund({ from: depositor }).should.be.rejectedWith('revert');
  })

  it("should reject getting refund by non-depositor", async () => {
    await refund.deposit({ value, from: depositor });
    await increaseTime(duration.days(1));
    await refund.getRefund({ from: nonDepositor }).should.be.rejectedWith('revert');
  })

  it("should return true if the depositor deposited", async () => {
    await refund.deposit({ value, from: depositor });
    const isMem = await refund.isMember(depositor);
    isMem.should.equal(true);
  })

  it("can withdraw if allowed", async () => {
    await refund.deposit({ value, from: depositor });
    await refund.enableWithdraw();
    await increaseTime(duration.weeks(1.1));
    const pre = web3.eth.getBalance(wallet);
    await refund.withdraw();
    const post = web3.eth.getBalance(wallet);
    post.minus(pre).should.be.bignumber.equal(value);
  })

  it('cannot withdraw if not allowed', async () => {
    await refund.deposit({ value, from: depositor });
    await increaseTime(duration.weeks(1.1));
    await refund.withdraw().should.be.rejectedWith('revert');
  })

  it("cannot withdraw before passing 1 week", async () => {
    await refund.deposit({ value, from: depositor });
    await increaseTime(duration.weeks(0.9));
    await refund.enableWithdraw();
    await refund.withdraw().should.be.rejectedWith('revert');
  })

})