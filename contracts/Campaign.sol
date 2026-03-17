// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Campaign
 * @dev Individual charity campaign contract with voting mechanism
 * @author PeduliChain Team
 */
contract Campaign {
    // Structs
    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    struct DisbursementProposal {
        uint256 id;
        uint256 amount;
        address recipient;
        string proofCID;
        uint256 proposedAt;
        uint256 deadline;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    // State variables
    address public coordinator;
    uint256 public goal;
    uint256 public deadline;
    string public metaCID;
    uint256 public totalRaised;
    bool public campaignEnded;

    Donation[] public donations;
    mapping(uint256 => DisbursementProposal) public disbursementProposals;
    uint256 public proposalCount;
    mapping(address => uint256) public donorContributions;
    address[] public donors;

    // Constants
    uint256 constant VOTING_PERIOD = 48 hours;
    uint256 constant MIN_VOTES = 3;

    // Events
    event Donated(address indexed donor, uint256 amount);
    event DisbursementProposed(
        uint256 indexed proposalId,
        uint256 amount,
        address recipient,
        string proofCID
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event DisbursementApproved(uint256 indexed proposalId);
    event DisbursementPaid(
        uint256 indexed proposalId,
        address recipient,
        uint256 amount
    );

    // Modifiers
    modifier onlyCoordinator() {
        require(msg.sender == coordinator, "Only coordinator can call this");
        _;
    }

    modifier beforeDeadline() {
        require(block.timestamp < deadline, "Campaign has ended");
        _;
    }

    modifier afterDeadline() {
        require(block.timestamp >= deadline, "Campaign is still active");
        _;
    }

    modifier onlyDonors() {
        require(donorContributions[msg.sender] > 0, "Only donors can vote");
        _;
    }

    /**
     * @dev Constructor to initialize campaign
     * @param _coordinator Address of the campaign coordinator
     * @param _goal Fundraising goal in wei
     * @param _deadline Campaign deadline as timestamp
     * @param _metaCID IPFS CID for campaign metadata
     */
    constructor(
        address _coordinator,
        uint256 _goal,
        uint256 _deadline,
        string memory _metaCID
    ) {
        coordinator = _coordinator;
        goal = _goal;
        deadline = _deadline;
        metaCID = _metaCID;
    }

    /**
     * @dev Donate to the campaign
     */
    function donate() external payable beforeDeadline {
        require(msg.value > 0, "Donation must be greater than 0");

        // Add to donor list if first donation
        if (donorContributions[msg.sender] == 0) {
            donors.push(msg.sender);
        }

        // Update storage
        donorContributions[msg.sender] += msg.value;
        totalRaised += msg.value;
        donations.push(Donation({
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit Donated(msg.sender, msg.value);
    }

    /**
     * @dev Propose disbursement of funds
     * @param amount Amount to disburse
     * @param recipient Address to receive funds
     * @param proofCID IPFS CID for proof of usage
     */
    function proposeDisbursement(
        uint256 amount,
        address recipient,
        string memory proofCID
    ) external onlyCoordinator {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient funds");
        require(bytes(proofCID).length > 0, "ProofCID cannot be empty");

        uint256 proposalId = proposalCount++;
        DisbursementProposal storage proposal = disbursementProposals[proposalId];
        
        proposal.id = proposalId;
        proposal.amount = amount;
        proposal.recipient = recipient;
        proposal.proofCID = proofCID;
        proposal.proposedAt = block.timestamp;
        proposal.deadline = block.timestamp + VOTING_PERIOD;

        emit DisbursementProposed(proposalId, amount, recipient, proofCID);
    }

    /**
     * @dev Vote on a disbursement proposal
     * @param proposalId ID of the proposal
     * @param support True for yes, false for no
     */
    function voteDisbursement(uint256 proposalId, bool support) external onlyDonors {
        DisbursementProposal storage proposal = disbursementProposals[proposalId];
        require(proposal.proposedAt > 0, "Proposal does not exist");
        require(block.timestamp < proposal.deadline, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Proposal already executed");

        proposal.hasVoted[msg.sender] = true;
        uint256 votingWeight = donorContributions[msg.sender];

        if (support) {
            proposal.votesFor += votingWeight;
        } else {
            proposal.votesAgainst += votingWeight;
        }

        emit VoteCast(proposalId, msg.sender, support, votingWeight);

        // Auto-approve if conditions met
        _checkAndExecuteProposal(proposalId);
    }

    /**
     * @dev Internal function to check and execute proposal
     * @param proposalId ID of the proposal
     */
    function _checkAndExecuteProposal(uint256 proposalId) internal {
        DisbursementProposal storage proposal = disbursementProposals[proposalId];
        
        // Check if minimum votes reached and majority approved
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        bool hasMinVotes = _getVoterCount(proposalId) >= MIN_VOTES;
        bool majorityApproved = proposal.votesFor > proposal.votesAgainst;

        if (hasMinVotes && majorityApproved && !proposal.executed) {
            proposal.executed = true;
            
            // Transfer funds
            (bool success, ) = proposal.recipient.call{value: proposal.amount}("");
            require(success, "Transfer failed");

            emit DisbursementApproved(proposalId);
            emit DisbursementPaid(proposalId, proposal.recipient, proposal.amount);
        }
    }

    /**
     * @dev Get number of unique voters for a proposal
     * @param proposalId ID of the proposal
     * @return Number of unique voters
     */
    function _getVoterCount(uint256 proposalId) internal view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < donors.length; i++) {
            if (disbursementProposals[proposalId].hasVoted[donors[i]]) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Get campaign details
     * @return _coordinator Address of the campaign coordinator
     * @return _goal Fundraising goal in wei
     * @return _deadline Campaign deadline timestamp
     * @return _metaCID IPFS metadata CID
     * @return _totalRaised Total funds raised
     * @return _donationCount Number of donations
     * @return _proposalCount Number of disbursement proposals
     */

    function getCampaignDetails() external view returns (
        address _coordinator,
        uint256 _goal,
        uint256 _deadline,
        string memory _metaCID,
        uint256 _totalRaised,
        uint256 _donationCount,
        uint256 _proposalCount
    ) {
        return (
            coordinator,
            goal,
            deadline,
            metaCID,
            totalRaised,
            donations.length,
            proposalCount
        );
    }

    /**
     * @dev Get all donations
     * @return Array of donations
     */
    function getDonations() external view returns (Donation[] memory) {
        return donations;
    }

    /**
     * @dev Get all donors
     * @return Array of donor addresses
     */
    function getDonors() external view returns (address[] memory) {
        return donors;
    }

    /**
     * @dev Check if address has voted on proposal
     * @param proposalId ID of the proposal
     * @param voter Address to check
     * @return True if voted
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return disbursementProposals[proposalId].hasVoted[voter];
    }

    /**
     * @dev Get proposal voting results
     * @param proposalId ID of the proposal
     * @return votesFor Number of votes in support
     * @return votesAgainst Number of votes against
     * @return executed Whether the proposal was executed
     * @return voterCount Total unique voters
     */

    function getProposalResults(uint256 proposalId) external view returns (
        uint256 votesFor,
        uint256 votesAgainst,
        bool executed,
        uint256 voterCount
    ) {
        DisbursementProposal storage proposal = disbursementProposals[proposalId];
        return (
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.executed,
            _getVoterCount(proposalId)
        );
    }

    /**
     * @dev Withdraw funds in case of emergency (only coordinator, after deadline)
     */
    function emergencyWithdraw() external onlyCoordinator afterDeadline {
        require(address(this).balance > 0, "No funds to withdraw");
        
        (bool success, ) = coordinator.call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}