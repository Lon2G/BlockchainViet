const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("PeduliChain", function () {
  let PeduliChain, peduliChain, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    PeduliChain = await ethers.getContractFactory("PeduliChain");
    peduliChain = await PeduliChain.deploy();
    await peduliChain.waitForDeployment();
  });

  it("should allow donations and update balances", async function () {
    const donationAmount = ethers.parseEther("5.0");

    await peduliChain.connect(addr1).donate({ value: donationAmount });
    const balance = await peduliChain.donations(addr1.address);

    expect(balance).to.equal(donationAmount);
  });

  it("should return total donations", async function () {
    const donation1 = ethers.parseEther("1.0");
    const donation2 = ethers.parseEther("2.0");

    await peduliChain.connect(addr1).donate({ value: donation1 });
    await peduliChain.connect(addr2).donate({ value: donation2 });

    const total = await peduliChain.totalDonations();
    expect(total).to.equal(donation1 + donation2);
  });
});


describe("CampaignFactory", function () {
  let campaignFactory, coordinator;
  const GOAL = ethers.parseEther("10");
  const DEADLINE = Math.floor(Date.now() / 1000) + 3600;
  const META_CID = "QmCID123";

  beforeEach(async function () {
    [coordinator] = await ethers.getSigners();
    const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
    campaignFactory = await CampaignFactory.deploy();
    await campaignFactory.waitForDeployment();

    await campaignFactory.createCampaign(
      coordinator.address,
      GOAL,
      DEADLINE,
      META_CID
    );
  });

  it("Should track campaigns by coordinator", async function () {
    const coordinatorCampaigns = await campaignFactory.getCampaignsByCoordinator(
      coordinator.address
    );
    expect(coordinatorCampaigns.length).to.equal(1);
  });

  it("Should reject invalid parameters", async function () {
    await expect(
      campaignFactory.createCampaign(
        ethers.ZeroAddress,
        GOAL,
        DEADLINE,
        META_CID
      )
    ).to.be.revertedWith("Invalid coordinator address");

    await expect(
      campaignFactory.createCampaign(
        coordinator.address,
        0,
        DEADLINE,
        META_CID
      )
    ).to.be.revertedWith("Goal must be greater than 0");

    const pastDeadline = Math.floor(Date.now() / 1000) - 1000;
    await expect(
      campaignFactory.createCampaign(
        coordinator.address,
        GOAL,
        pastDeadline,
        META_CID
      )
    ).to.be.revertedWith("Deadline must be in the future");
  });
});


describe("Campaign", function () {
  let Campaign, campaign, coordinator, donor1, donor2, donor3, recipient;

  beforeEach(async function () {
    [coordinator, donor1, donor2, donor3, recipient] =
      await ethers.getSigners();
    Campaign = await ethers.getContractFactory("Campaign");
    campaign = await Campaign.deploy(
      coordinator.address,
      ethers.parseEther("5"),
      Math.floor(Date.now() / 1000) + 3600,
      "metaCID"
    );
    await campaign.waitForDeployment();
  });

  it("Should accept donations", async function () {
    const donationAmount = ethers.parseEther("1.0");

    await expect(
      campaign.connect(donor1).donate({ value: donationAmount })
    )
      .to.emit(campaign, "Donated")
      .withArgs(donor1.address, donationAmount);

    expect(await campaign.totalRaised()).to.equal(donationAmount);
    expect(await campaign.donorContributions(donor1.address)).to.equal(
      donationAmount
    );
  });

  it("Should track multiple donations", async function () {
    const amount1 = ethers.parseEther("1.0");
    const amount2 = ethers.parseEther("0.5");

    await campaign.connect(donor1).donate({ value: amount1 });
    await campaign.connect(donor1).donate({ value: amount2 });

    expect(await campaign.totalRaised()).to.equal(amount1 + amount2);
    expect(await campaign.donorContributions(donor1.address)).to.equal(
      amount1 + amount2
    );
  });

  it("Should allow coordinator to propose disbursement", async function () {
    await campaign.connect(donor1).donate({ value: ethers.parseEther("2.0") });

    const disbursementAmount = ethers.parseEther("1.0");
    const proofCID = "QmProofCID123";

    await expect(
      campaign.connect(coordinator).proposeDisbursement(
        disbursementAmount,
        recipient.address,
        proofCID
      )
    )
      .to.emit(campaign, "DisbursementProposed")
      .withArgs(0, disbursementAmount, recipient.address, proofCID);
  });

  it("Should allow donors to vote on disbursements", async function () {
    const donationAmount = ethers.parseEther("2.0");
    await campaign.connect(donor1).donate({ value: donationAmount });
    await campaign.connect(donor2).donate({ value: donationAmount });

    const disbAmount = ethers.parseEther("1.0");
    await campaign.connect(coordinator).proposeDisbursement(
      disbAmount,
      recipient.address,
      "QmProofCID123"
    );

    await expect(
      campaign.connect(donor1).voteDisbursement(0, true)
    )
      .to.emit(campaign, "VoteCast")
      .withArgs(0, donor1.address, true, donationAmount);

    const [forVotes, againstVotes, executed, voterCount] =
      await campaign.getProposalResults(0);
    expect(forVotes).to.equal(donationAmount);
    expect(againstVotes).to.equal(0);
    expect(executed).to.equal(false);
    expect(voterCount).to.equal(1);
  });

  it("Should auto-approve and execute disbursement with majority vote", async function () {
    const donationAmount = ethers.parseEther("1.0");
    await campaign.connect(donor1).donate({ value: donationAmount });
    await campaign.connect(donor2).donate({ value: donationAmount });
    await campaign.connect(donor3).donate({ value: donationAmount });

    const disbAmount = ethers.parseEther("1.5");
    await campaign.connect(coordinator).proposeDisbursement(
      disbAmount,
      recipient.address,
      "QmProofCID123"
    );

    const initialBalance = await ethers.provider.getBalance(
      recipient.address
    );

    await campaign.connect(donor1).voteDisbursement(0, true);
    await campaign.connect(donor2).voteDisbursement(0, true);

    await expect(
      campaign.connect(donor3).voteDisbursement(0, true)
    )
      .to.emit(campaign, "DisbursementApproved")
      .withArgs(0)
      .and.to.emit(campaign, "DisbursementPaid")
      .withArgs(0, recipient.address, disbAmount);

    const finalBalance = await ethers.provider.getBalance(recipient.address);
    expect(finalBalance - initialBalance).to.equal(disbAmount);
  });

  it("Should reject invalid disbursement proposals", async function () {
    await expect(
      campaign.connect(coordinator).proposeDisbursement(
        ethers.parseEther("1.0"),
        ethers.ZeroAddress,
        "QmProofCID123"
      )
    ).to.be.revertedWith("Invalid recipient");

    await expect(
      campaign.connect(coordinator).proposeDisbursement(
        ethers.parseEther("10.0"),
        recipient.address,
        "QmProofCID123"
      )
    ).to.be.revertedWith("Insufficient funds");

    await expect(
      campaign.connect(donor1).proposeDisbursement(
        ethers.parseEther("1.0"),
        recipient.address,
        "QmProofCID123"
      )
    ).to.be.revertedWith("Only coordinator can call this");
  });

  it("Should prevent non-donors from voting", async function () {
    await campaign.connect(donor1).donate({ value: ethers.parseEther("1.0") });
    await campaign.connect(coordinator).proposeDisbursement(
      ethers.parseEther("0.5"),
      recipient.address,
      "QmProofCID123"
    );

    await expect(
      campaign.connect(donor2).voteDisbursement(0, true)
    ).to.be.revertedWith("Only donors can vote");
  });

  it("Should prevent double voting", async function () {
    await campaign.connect(donor1).donate({ value: ethers.parseEther("1.0") });
    await campaign.connect(coordinator).proposeDisbursement(
      ethers.parseEther("0.5"),
      recipient.address,
      "QmProofCID123"
    );

    await campaign.connect(donor1).voteDisbursement(0, true);

    await expect(
      campaign.connect(donor1).voteDisbursement(0, false)
    ).to.be.revertedWith("Already voted");
  });
});
