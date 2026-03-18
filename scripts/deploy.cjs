const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  console.log("Deploying PeduliChain contracts to Sepolia...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy CampaignFactory
  const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
  const campaignFactory = await CampaignFactory.deploy();
  await campaignFactory.waitForDeployment();

  const factoryAddress = await campaignFactory.getAddress();
  console.log("CampaignFactory deployed to:", factoryAddress);

  // Create a sample campaign for testing
  const goalInWei = ethers.parseEther("5.0"); // 5 ETH goal
  const deadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now
  const metaCID = "QmSampleCIDForTesting123456789";

  console.log("Creating sample campaign...");
  const createTx = await campaignFactory.createCampaign(
    deployer.address,
    goalInWei,
    deadline,
    metaCID
  );
  await createTx.wait();

  const campaigns = await campaignFactory.getAllCampaigns();
  console.log("Sample campaign created at:", campaigns[0]);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    campaignFactory: factoryAddress,
    sampleCampaign: campaigns[0],
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log(`VITE_CAMPAIGN_FACTORY_ADDRESS=${factoryAddress}`);
  console.log("=========================\n");

  // Verify contracts on block explorer
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying contracts...");
    try {
      await hre.run("verify:verify", {
        address: factoryAddress,
        contract: "contracts/CampaignFactory.sol:CampaignFactory",
        constructorArguments: [],
      });
      console.log("CampaignFactory verified!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
