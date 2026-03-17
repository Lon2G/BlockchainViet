require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },

  networks: {
    liskSepolia: {
      // Must be a true JSON-RPC node; Blockscout Explorer /api is NOT RPC
      url: process.env.INFURA_URL,
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 600000 
    }
  },

  etherscan: {
    // You can put any non‐empty string here if Blockscout doesn't require an API key.
    apiKey: { liskSepolia: process.env.BLOCKSCOUT_API_KEY || "BLOCKSCOUT" },

    customChains: [
      {
        network: "liskSepolia",
        chainId: 11155111,
        urls: {
          // Blockscout Explorer’s API endpoint for verification
          apiURL: "https://eth-sepolia.blockscout.com/api",
          // Blockscout Explorer front-end
          browserURL: "https://eth-sepolia.blockscout.com"
        }
      }
    ]
  }
};
