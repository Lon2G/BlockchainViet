// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Campaign.sol";

/**
 * @title CampaignFactory
 * @dev Factory contract for creating charity campaigns
 * @author PeduliChain Team
 */
contract CampaignFactory {
    // Events
    event CampaignCreated(
        address indexed campaignAddress,
        address indexed coordinator,
        uint256 goal,
        uint256 deadline,
        string metaCID
    );

    // Storage
    mapping(address => address[]) public coordinatorCampaigns;
    address[] public allCampaigns;

    /**
     * @dev Creates a new charity campaign
     * @param coordinator Address of the campaign coordinator
     * @param goal Fundraising goal in wei
     * @param deadline Campaign deadline as timestamp
     * @param metaCID IPFS CID for campaign metadata
     * @return campaignAddress Address of the newly created campaign
     */
    function createCampaign(
        address coordinator,
        uint256 goal,
        uint256 deadline,
        string memory metaCID
    ) external returns (address campaignAddress) {
        require(coordinator != address(0), "Invalid coordinator address");
        require(goal > 0, "Goal must be greater than 0");
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(bytes(metaCID).length > 0, "MetaCID cannot be empty");

        // Deploy new campaign contract
        Campaign newCampaign = new Campaign(
            coordinator,
            goal,
            deadline,
            metaCID
        );

        campaignAddress = address(newCampaign);

        // Update storage
        coordinatorCampaigns[coordinator].push(campaignAddress);
        allCampaigns.push(campaignAddress);

        // Emit event
        emit CampaignCreated(
            campaignAddress,
            coordinator,
            goal,
            deadline,
            metaCID
        );
    }

    /**
     * @dev Returns all campaigns created by a coordinator
     * @param coordinator Address of the coordinator
     * @return Array of campaign addresses
     */
    function getCampaignsByCoordinator(address coordinator) 
        external 
        view 
        returns (address[] memory) 
    {
        return coordinatorCampaigns[coordinator];
    }

    /**
     * @dev Returns all campaigns
     * @return Array of all campaign addresses
     */
    function getAllCampaigns() external view returns (address[] memory) {
        return allCampaigns;
    }

    /**
     * @dev Returns the total number of campaigns
     * @return Total number of campaigns
     */
    function getTotalCampaigns() external view returns (uint256) {
        return allCampaigns.length;
    }
}