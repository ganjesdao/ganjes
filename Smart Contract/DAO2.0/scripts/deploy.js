const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying GanjesDAO...");

  // Get the ContractFactory and Signers
  const [deployer, owner1, owner2, owner3] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy a mock governance token for testing
  console.log("\nDeploying MockERC20 token...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Ganjes Token", "GNJ", ethers.parseEther("1000000"));
  await mockToken.waitForDeployment();
  console.log("MockERC20 deployed to:", await mockToken.getAddress());

  // Deploy GanjesDAO
  console.log("\nDeploying GanjesDAO...");
  const GanjesDAO = await ethers.getContractFactory("GanjesDAO");
  
  // Multi-sig owners (minimum 3 required)
  const initialOwners = [
    deployer.address,
    owner1.address,
    owner2.address
  ];
  
  const requiredApprovals = 2; // Require 2 out of 3 approvals

  const ganjesDAO = await GanjesDAO.deploy(
    await mockToken.getAddress(),
    initialOwners,
    requiredApprovals
  );
  await ganjesDAO.waitForDeployment();
  console.log("GanjesDAO deployed to:", await ganjesDAO.getAddress());

  // Transfer some tokens to the DAO for testing
  console.log("\nTransferring tokens to DAO for testing...");
  const transferAmount = ethers.parseEther("10000");
  await mockToken.transfer(await ganjesDAO.getAddress(), transferAmount);
  console.log(`Transferred ${ethers.formatEther(transferAmount)} tokens to DAO`);

  // Distribute tokens to test accounts
  console.log("\nDistributing tokens to test accounts...");
  const distributionAmount = ethers.parseEther("1000");
  await mockToken.transfer(owner1.address, distributionAmount);
  await mockToken.transfer(owner2.address, distributionAmount);
  await mockToken.transfer(owner3.address, distributionAmount);
  console.log(`Distributed ${ethers.formatEther(distributionAmount)} tokens to each test account`);

  console.log("\nDeployment Summary:");
  console.log("==================");
  console.log("MockERC20 Token:", await mockToken.getAddress());
  console.log("GanjesDAO:", await ganjesDAO.getAddress());
  console.log("Initial Owners:", initialOwners);
  console.log("Required Approvals:", requiredApprovals);
  console.log("DAO Token Balance:", ethers.formatEther(await mockToken.balanceOf(await ganjesDAO.getAddress())));

  // Verify deployment
  console.log("\nVerifying deployment...");
  const daoStatus = await ganjesDAO.getContractStatus();
  console.log("DAO Paused:", daoStatus.isPaused);
  console.log("Total Proposals:", daoStatus.totalProposals.toString());
  console.log("DAO Balance:", ethers.formatEther(daoStatus.daoBalance));

  return {
    mockToken: await mockToken.getAddress(),
    ganjesDAO: await ganjesDAO.getAddress(),
    deployer: deployer.address,
    owners: initialOwners
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;