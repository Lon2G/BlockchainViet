const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.MOCK_BACKEND_PORT || 3001);
const DB_PATH = path.join(__dirname, "..", "mock-data", "pedulichain-db.json");

const defaultDb = {
  users: [
    {
      id: "usr-gmail-1",
      provider: "gmail",
      name: "Alex Carter",
      username: "alexcarter",
      email: "alexcarter@gmail.com",
      passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
      createdAt: "2026-03-17T08:00:00.000Z"
    }
  ],
  googleAccounts: [
    {
      id: "usr-google-1",
      provider: "google",
      name: "Emma Wilson",
      email: "emma.wilson@gmail.com",
      username: "emma.wilson"
    },
    {
      id: "usr-google-2",
      provider: "google",
      name: "Noah Martinez",
      email: "noah.martinez@gmail.com",
      username: "noah.martinez"
    },
    {
      id: "usr-google-3",
      provider: "google",
      name: "Sophia Nguyen",
      email: "sophia.nguyen@gmail.com",
      username: "sophia.nguyen"
    }
  ],
  campaigns: [
    {
      address: "0x1000000000000000000000000000000000000001",
      title: "Clean Water for Rural Communities",
      description: "Providing access to clean drinking water for remote villages in developing regions.",
      category: "Environment",
      coordinator: "0x1234567890123456789012345678901234567890",
      goal: "5000000000000000000",
      deadline: 1798675200,
      initialDeposit: "250000000000000000",
      txHash: "0x3a8f8a8a9a4a1d6cd20a4d3fbb2f2a170fd9cb26f7b8e960d92d7cbcc2f2a101",
      createdAt: "2026-03-17T09:00:00.000Z",
      metaCID: "peduli:seed-1",
      refunds: [],
      withdrawals: [],
      donations: [
        {
          donor: "0x1111111111111111111111111111111111111111",
          amount: "1500000000000000000",
          timestamp: 1777651200,
          txHash: "0x3c8e3a6397005a5703e4d81f6337c6d5ac3b1f4f74c1122f79d7ab2ee1c90001"
        },
        {
          donor: "0x2222222222222222222222222222222222222222",
          amount: "2250000000000000000",
          timestamp: 1777737600,
          txHash: "0x3c8e3a6397005a5703e4d81f6337c6d5ac3b1f4f74c1122f79d7ab2ee1c90002"
        }
      ]
    },
    {
      address: "0x1000000000000000000000000000000000000002",
      title: "Education for Underprivileged Children",
      description: "Building schools and providing educational resources for children in need.",
      category: "Education",
      coordinator: "0x2345678901234567890123456789012345678901",
      goal: "8000000000000000000",
      deadline: 1803945600,
      initialDeposit: "500000000000000000",
      txHash: "0x7a7f8a8a9a4a1d6cd20a4d3fbb2f2a170fd9cb26f7b8e960d92d7cbcc2f2a202",
      createdAt: "2026-03-17T09:15:00.000Z",
      metaCID: "peduli:seed-2",
      refunds: [],
      withdrawals: [],
      donations: [
        {
          donor: "0x3333333333333333333333333333333333333333",
          amount: "3200000000000000000",
          timestamp: 1777824000,
          txHash: "0x6c8e3a6397005a5703e4d81f6337c6d5ac3b1f4f74c1122f79d7ab2ee1c90003"
        },
        {
          donor: "0x4444444444444444444444444444444444444444",
          amount: "3200000000000000000",
          timestamp: 1777910400,
          txHash: "0x6c8e3a6397005a5703e4d81f6337c6d5ac3b1f4f74c1122f79d7ab2ee1c90004"
        }
      ]
    },
    {
      address: "0x1000000000000000000000000000000000000003",
      title: "Medical Aid for Disaster Relief",
      description: "Emergency medical supplies and support for natural disaster victims.",
      category: "Healthcare",
      coordinator: "0x3456789012345678901234567890123456789012",
      goal: "10000000000000000000",
      deadline: 1796083200,
      initialDeposit: "1000000000000000000",
      txHash: "0x8b7f8a8a9a4a1d6cd20a4d3fbb2f2a170fd9cb26f7b8e960d92d7cbcc2f2a303",
      createdAt: "2026-03-17T09:30:00.000Z",
      metaCID: "peduli:seed-3",
      refunds: [],
      withdrawals: [],
      donations: [
        {
          donor: "0x5555555555555555555555555555555555555555",
          amount: "4000000000000000000",
          timestamp: 1777996800,
          txHash: "0x9c8e3a6397005a5703e4d81f6337c6d5ac3b1f4f74c1122f79d7ab2ee1c90005"
        },
        {
          donor: "0x6666666666666666666666666666666666666666",
          amount: "6000000000000000000",
          timestamp: 1778083200,
          txHash: "0x9c8e3a6397005a5703e4d81f6337c6d5ac3b1f4f74c1122f79d7ab2ee1c90006"
        }
      ]
    }
  ]
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(payload, null, 2));
};

const readBody = async (req) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const ensureDb = async () => {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(defaultDb, null, 2));
  }
};

const normalizeCampaignRecord = (campaign) => ({
  ...campaign,
  donations: Array.isArray(campaign.donations) ? campaign.donations : [],
  refunds: Array.isArray(campaign.refunds) ? campaign.refunds : [],
  withdrawals: Array.isArray(campaign.withdrawals) ? campaign.withdrawals : []
});

const normalizeDb = (db) => ({
  users: Array.isArray(db.users) ? db.users : defaultDb.users,
  googleAccounts: Array.isArray(db.googleAccounts) ? db.googleAccounts : defaultDb.googleAccounts,
  campaigns: Array.isArray(db.campaigns)
    ? db.campaigns.map(normalizeCampaignRecord)
    : defaultDb.campaigns.map(normalizeCampaignRecord)
});

const writeDb = async (db) => {
  await fs.writeFile(DB_PATH, JSON.stringify(normalizeDb(db), null, 2));
};

const fakeHash = () => `0x${crypto.randomBytes(32).toString("hex")}`;
const fakeAddress = () => `0x${crypto.randomBytes(20).toString("hex")}`;
const hashPassword = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const nowInSeconds = () => Math.floor(Date.now() / 1000);
const toAuthUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  username: user.username,
  provider: user.provider
});

const getGrossRaisedAmount = (campaign) => (
  normalizeCampaignRecord(campaign).donations.reduce((total, donation) => total + BigInt(donation.amount || "0"), 0n)
);

const getRefundedAmount = (campaign) => (
  normalizeCampaignRecord(campaign).refunds.reduce((total, refund) => total + BigInt(refund.amount || "0"), 0n)
);

const getNetRaisedAmount = (campaign) => {
  const grossRaised = getGrossRaisedAmount(campaign);
  const refunded = getRefundedAmount(campaign);
  return grossRaised > refunded ? grossRaised - refunded : 0n;
};

const getWithdrawnAmount = (campaign) => (
  normalizeCampaignRecord(campaign).withdrawals.reduce((total, withdrawal) => total + BigInt(withdrawal.amount || "0"), 0n)
);

const getWithdrawableAmount = (campaign) => {
  const normalized = normalizeCampaignRecord(campaign);
  const goal = BigInt(normalized.goal || "0");
  const netRaised = getNetRaisedAmount(normalized);
  const withdrawn = getWithdrawnAmount(normalized);

  if (normalized.refunds.length > 0 || netRaised < goal) {
    return 0n;
  }

  return netRaised > withdrawn ? netRaised - withdrawn : 0n;
};

const getFundingStatus = (campaign, now = nowInSeconds()) => {
  const normalized = normalizeCampaignRecord(campaign);
  const goal = BigInt(normalized.goal || "0");
  const netRaised = getNetRaisedAmount(normalized);
  const expired = Number(normalized.deadline || 0) <= now;

  if (normalized.refunds.length > 0) {
    return "refunded";
  }

  if (netRaised >= goal && goal > 0n) {
    return expired ? "successful" : "goal-reached";
  }

  return expired ? "expired" : "active";
};

const maybeAutoRefundCampaign = (campaign, now = nowInSeconds()) => {
  const normalized = normalizeCampaignRecord(campaign);
  const goal = BigInt(normalized.goal || "0");
  const grossRaised = getGrossRaisedAmount(normalized);
  const expired = Number(normalized.deadline || 0) <= now;

  if (!expired || grossRaised >= goal || normalized.refunds.length > 0) {
    return false;
  }

  normalized.refunds = normalized.donations.map((donation) => ({
    donor: donation.donor,
    amount: String(donation.amount),
    timestamp: now,
    txHash: fakeHash(),
    donationTxHash: donation.txHash,
    supporterName: donation.supporterName,
    message: donation.message
  }));
  normalized.refundProcessedAt = new Date(now * 1000).toISOString();

  Object.assign(campaign, normalized);
  return true;
};

const applyCampaignPolicies = (db) => {
  let changed = false;
  const now = nowInSeconds();

  db.campaigns.forEach((campaign) => {
    if (maybeAutoRefundCampaign(campaign, now)) {
      changed = true;
    }
  });

  return changed;
};

const readDb = async () => {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf8");
  const db = normalizeDb(JSON.parse(raw));

  if (applyCampaignPolicies(db)) {
    await writeDb(db);
  }

  return db;
};

const normalizeCampaign = (campaign) => {
  const normalized = normalizeCampaignRecord(campaign);
  const withdrawnAmount = getWithdrawnAmount(normalized);
  const withdrawableAmount = getWithdrawableAmount(normalized);

  return {
    ...normalized,
    donations: [...normalized.donations].sort((a, b) => b.timestamp - a.timestamp),
    refunds: [...normalized.refunds].sort((a, b) => b.timestamp - a.timestamp),
    withdrawals: [...normalized.withdrawals].sort((a, b) => b.timestamp - a.timestamp),
    grossRaisedAmount: getGrossRaisedAmount(normalized).toString(),
    refundedAmount: getRefundedAmount(normalized).toString(),
    raisedAmount: getNetRaisedAmount(normalized).toString(),
    withdrawnAmount: withdrawnAmount.toString(),
    withdrawableAmount: withdrawableAmount.toString(),
    fundingStatus: getFundingStatus(normalized),
    disbursementStatus: withdrawableAmount > 0n ? "available" : withdrawnAmount > 0n ? "withdrawn" : "locked"
  };
};

const notFound = (res, message = "Resource not found") => sendJson(res, 404, { error: message });

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    return notFound(res);
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/mock/health") {
      return sendJson(res, 200, { ok: true, mode: "mock-json", dbPath: DB_PATH });
    }

    if (req.method === "GET" && pathname === "/api/mock/auth/google-accounts") {
      const db = await readDb();
      return sendJson(res, 200, {
        accounts: db.googleAccounts.map(toAuthUser)
      });
    }

    if (req.method === "POST" && pathname === "/api/mock/auth/register") {
      const db = await readDb();
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const fullName = String(body.fullName || "").trim();
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const confirmPassword = String(body.confirmPassword || "");

      if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
        return sendJson(res, 400, { error: "Please enter a valid Gmail address." });
      }

      if (!fullName) {
        return sendJson(res, 400, { error: "Full name is required." });
      }

      if (!username) {
        return sendJson(res, 400, { error: "Username is required." });
      }

      if (password.length < 8) {
        return sendJson(res, 400, { error: "Password must be at least 8 characters long." });
      }

      if (password !== confirmPassword) {
        return sendJson(res, 400, { error: "Password confirmation does not match." });
      }

      const emailTaken = db.users.some((user) => user.email.toLowerCase() === email);
      if (emailTaken) {
        return sendJson(res, 409, { error: "An account with this Gmail already exists." });
      }

      const usernameTaken = db.users.some((user) => String(user.username || "").toLowerCase() === username.toLowerCase());
      if (usernameTaken) {
        return sendJson(res, 409, { error: "This username is already in use." });
      }

      const user = {
        id: `usr-gmail-${crypto.randomUUID()}`,
        provider: "gmail",
        name: fullName,
        username,
        email,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString()
      };

      db.users.unshift(user);
      await writeDb(db);

      return sendJson(res, 201, { user: toAuthUser(user) });
    }

    if (req.method === "POST" && pathname === "/api/mock/auth/login") {
      const db = await readDb();
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");

      if (!email || !password) {
        return sendJson(res, 400, { error: "Email and password are required." });
      }

      const user = db.users.find((item) => item.email.toLowerCase() === email && item.provider === "gmail");
      if (!user || user.passwordHash !== hashPassword(password)) {
        return sendJson(res, 401, { error: "Invalid Gmail or password." });
      }

      return sendJson(res, 200, { user: toAuthUser(user) });
    }

    if (req.method === "POST" && pathname === "/api/mock/auth/google-login") {
      const db = await readDb();
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const account = db.googleAccounts.find((item) => item.email.toLowerCase() === email);

      if (!account) {
        return sendJson(res, 404, { error: "Google account not found." });
      }

      return sendJson(res, 200, { user: toAuthUser(account) });
    }

    if (req.method === "GET" && pathname === "/api/mock/campaigns") {
      const db = await readDb();
      return sendJson(res, 200, db.campaigns.map(normalizeCampaign));
    }

    if (req.method === "GET" && pathname.startsWith("/api/mock/campaigns/")) {
      const campaignId = decodeURIComponent(pathname.replace("/api/mock/campaigns/", ""));
      const db = await readDb();
      const campaign = db.campaigns.find((item) => item.address.toLowerCase() === campaignId.toLowerCase());

      if (!campaign) {
        return notFound(res, "Campaign not found");
      }

      return sendJson(res, 200, normalizeCampaign(campaign));
    }

    if (req.method === "POST" && pathname === "/api/mock/campaigns") {
      const db = await readDb();
      const body = await readBody(req);
      const goal = BigInt(String(body.goal || "0"));
      const deadline = Number(body.deadline || nowInSeconds());

      if (!body.title || !body.description || !body.category) {
        return sendJson(res, 400, { error: "Missing required campaign fields" });
      }

      if (goal <= 0n) {
        return sendJson(res, 400, { error: "Funding goal must be greater than 0." });
      }

      if (!Number.isFinite(deadline) || deadline <= nowInSeconds()) {
        return sendJson(res, 400, { error: "Campaign deadline must be in the future." });
      }

      const createTxHash = fakeHash();
      const donationTxHash = body.initialDeposit && BigInt(body.initialDeposit) > 0n ? fakeHash() : "";
      const campaign = {
        address: fakeAddress(),
        title: String(body.title).trim(),
        description: String(body.description).trim(),
        category: String(body.category).trim(),
        coordinator: body.coordinator || fakeAddress(),
        goal: goal.toString(),
        deadline,
        initialDeposit: String(body.initialDeposit || "0"),
        txHash: donationTxHash || createTxHash,
        createdAt: new Date().toISOString(),
        metaCID: `peduli:mock-${crypto.randomUUID()}`,
        refunds: [],
        withdrawals: [],
        donations: []
      };

      if (BigInt(campaign.initialDeposit) > 0n) {
        campaign.donations.push({
          donor: campaign.coordinator,
          amount: campaign.initialDeposit,
          timestamp: nowInSeconds(),
          txHash: donationTxHash
        });
      }

      db.campaigns.unshift(campaign);
      await writeDb(db);

      return sendJson(res, 201, {
        campaign: normalizeCampaign(campaign),
        createTxHash,
        donationTxHash
      });
    }

    if (req.method === "POST" && pathname.endsWith("/donations") && pathname.startsWith("/api/mock/campaigns/")) {
      const campaignId = decodeURIComponent(
        pathname.replace("/api/mock/campaigns/", "").replace(/\/donations$/, "")
      );
      const db = await readDb();
      const campaign = db.campaigns.find((item) => item.address.toLowerCase() === campaignId.toLowerCase());

      if (!campaign) {
        return notFound(res, "Campaign not found");
      }

      const now = nowInSeconds();
      const status = getFundingStatus(campaign, now);
      if (status === "refunded") {
        await writeDb(db);
        return sendJson(res, 409, {
          error: "This campaign expired before reaching its goal. All donations were refunded automatically."
        });
      }

      if (Number(campaign.deadline || 0) <= now) {
        return sendJson(res, 409, {
          error: "This campaign is closed because its funding window has ended."
        });
      }

      const body = await readBody(req);
      if (!body.donor || !body.amount || BigInt(body.amount) <= 0n) {
        return sendJson(res, 400, { error: "Invalid donation payload" });
      }

      const txHash = fakeHash();
      campaign.donations.unshift({
        donor: body.donor,
        amount: String(body.amount),
        timestamp: now,
        txHash,
        supporterName: body.supporterName ? String(body.supporterName).trim() : undefined,
        message: body.message ? String(body.message).trim() : undefined
      });

      await writeDb(db);
      return sendJson(res, 201, { txHash, campaign: normalizeCampaign(campaign) });
    }

    if (req.method === "POST" && pathname.endsWith("/withdraw") && pathname.startsWith("/api/mock/campaigns/")) {
      const campaignId = decodeURIComponent(
        pathname.replace("/api/mock/campaigns/", "").replace(/\/withdraw$/, "")
      );
      const db = await readDb();
      const campaign = db.campaigns.find((item) => item.address.toLowerCase() === campaignId.toLowerCase());

      if (!campaign) {
        return notFound(res, "Campaign not found");
      }

      const body = await readBody(req);
      const requester = String(body.requester || "").trim().toLowerCase();
      if (!requester) {
        return sendJson(res, 400, { error: "Requester wallet is required." });
      }

      if (String(campaign.coordinator || "").toLowerCase() !== requester) {
        return sendJson(res, 403, { error: "Only the campaign creator can withdraw funds." });
      }

      if (getFundingStatus(campaign) === "refunded") {
        return sendJson(res, 409, { error: "This campaign was refunded, so there are no funds available to withdraw." });
      }

      const withdrawableAmount = getWithdrawableAmount(campaign);
      if (withdrawableAmount <= 0n) {
        return sendJson(res, 409, {
          error: "Funds can only be withdrawn after the campaign reaches its full funding goal."
        });
      }

      const txHash = fakeHash();
      campaign.withdrawals.unshift({
        recipient: campaign.coordinator,
        amount: withdrawableAmount.toString(),
        timestamp: nowInSeconds(),
        txHash
      });

      await writeDb(db);
      return sendJson(res, 201, { txHash, campaign: normalizeCampaign(campaign) });
    }

    return notFound(res);
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unknown mock backend error"
    });
  }
});

server.listen(PORT, () => {
  console.log(`Mock backend listening on http://localhost:${PORT}`);
  console.log(`Mock database: ${DB_PATH}`);
});
