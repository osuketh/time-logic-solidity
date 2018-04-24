const Refund = artifacts.require("RefundContract");
const wallet = "0x821aea9a577a9b44299b9c15c88cf3087f3b5544";

module.exports = (deployer) => {
  deployer.deploy(Refund, wallet);
}