// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Campaign
 * @dev Fundraising contract for a single charity campaign.
 * Rules:
 * - Anyone can donate before the deadline.
 * - The coordinator can withdraw only after the goal is reached.
 * - If the deadline passes without reaching the goal, anyone can trigger refunds
 *   and the contract pays each donor back their full contribution.
 */
contract Campaign {
    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    struct Refund {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    struct Withdrawal {
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }

    address public coordinator;
    uint256 public goal;
    uint256 public deadline;
    string public metaCID;

    uint256 public totalRaised;
    uint256 public totalRefunded;
    uint256 public totalWithdrawn;
    bool public fundsWithdrawn;
    bool public refundsProcessed;

    Donation[] private donations;
    Refund[] private refunds;
    Withdrawal[] private withdrawals;
    mapping(address => uint256) public donorContributions;
    address[] private donors;

    uint256 private unlocked = 1;

    event Donated(address indexed donor, uint256 amount, uint256 timestamp);
    event FundsWithdrawn(address indexed recipient, uint256 amount, uint256 timestamp);
    event Refunded(address indexed donor, uint256 amount, uint256 timestamp);
    event RefundsProcessed(uint256 donorCount, uint256 totalAmount, uint256 timestamp);

    modifier onlyCoordinator() {
        require(msg.sender == coordinator, "Only coordinator can call this");
        _;
    }

    modifier beforeDeadline() {
        require(block.timestamp < deadline, "Campaign has ended");
        _;
    }

    modifier nonReentrant() {
        require(unlocked == 1, "Reentrant call");
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor(
        address _coordinator,
        uint256 _goal,
        uint256 _deadline,
        string memory _metaCID
    ) {
        require(_coordinator != address(0), "Invalid coordinator");
        require(_goal > 0, "Goal must be greater than 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(bytes(_metaCID).length > 0, "MetaCID cannot be empty");

        coordinator = _coordinator;
        goal = _goal;
        deadline = _deadline;
        metaCID = _metaCID;
    }

    function donate() external payable beforeDeadline nonReentrant {
        require(!refundsProcessed, "Refunds already processed");
        require(msg.value > 0, "Donation must be greater than 0");

        if (donorContributions[msg.sender] == 0) {
            donors.push(msg.sender);
        }

        donorContributions[msg.sender] += msg.value;
        totalRaised += msg.value;
        donations.push(Donation({
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit Donated(msg.sender, msg.value, block.timestamp);
    }

    function withdrawFunds() external onlyCoordinator nonReentrant {
        require(totalRaised >= goal, "Goal not reached");
        require(!fundsWithdrawn, "Funds already withdrawn");

        uint256 amount = address(this).balance;
        require(amount > 0, "No funds available");

        fundsWithdrawn = true;
        totalWithdrawn = amount;

        (bool success, ) = coordinator.call{value: amount}("");
        require(success, "Withdrawal failed");

        withdrawals.push(Withdrawal({
            recipient: coordinator,
            amount: amount,
            timestamp: block.timestamp
        }));

        emit FundsWithdrawn(coordinator, amount, block.timestamp);
    }

    function processRefunds() external nonReentrant {
        require(block.timestamp >= deadline, "Campaign is still active");
        require(totalRaised < goal, "Goal was reached");
        require(!refundsProcessed, "Refunds already processed");

        refundsProcessed = true;

        uint256 donorCount = donors.length;
        uint256 refundedTotal = 0;

        for (uint256 i = 0; i < donorCount; i++) {
            address donor = donors[i];
            uint256 amount = donorContributions[donor];

            if (amount == 0) {
                continue;
            }

            donorContributions[donor] = 0;
            refundedTotal += amount;

            refunds.push(Refund({
                donor: donor,
                amount: amount,
                timestamp: block.timestamp
            }));

            (bool success, ) = donor.call{value: amount}("");
            require(success, "Refund transfer failed");

            emit Refunded(donor, amount, block.timestamp);
        }

        totalRefunded = refundedTotal;
        emit RefundsProcessed(donorCount, refundedTotal, block.timestamp);
    }

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
            0
        );
    }

    function getCampaignState() external view returns (
        uint256 _contractBalance,
        uint256 _totalRefunded,
        uint256 _totalWithdrawn,
        uint256 _withdrawableAmount,
        bool _refundsProcessed,
        bool _fundsWithdrawn
    ) {
        uint256 withdrawableAmount = totalRaised >= goal && !fundsWithdrawn
            ? address(this).balance
            : 0;

        return (
            address(this).balance,
            totalRefunded,
            totalWithdrawn,
            withdrawableAmount,
            refundsProcessed,
            fundsWithdrawn
        );
    }

    function getDonations() external view returns (Donation[] memory) {
        return donations;
    }

    function getRefunds() external view returns (Refund[] memory) {
        return refunds;
    }

    function getWithdrawals() external view returns (Withdrawal[] memory) {
        return withdrawals;
    }

    function getDonors() external view returns (address[] memory) {
        return donors;
    }

    function getContributionOf(address donor) external view returns (uint256) {
        return donorContributions[donor];
    }
}
