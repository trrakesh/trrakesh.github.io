const API_URL =
  window.GOLD_API_URL ||
  "https://appdata.manoramaonline.com/common/MMOnlineVipani/gold/goldRate.json";

const statusEl = document.getElementById("status");
const ratesGridEl = document.getElementById("ratesGrid");
const updatedDateEl = document.getElementById("updatedDate");
const refreshBtn = document.getElementById("refreshBtn");
const cardTemplate = document.getElementById("rateCardTemplate");

const cardsConfig = [
  {
    label: "Gold 22K (8 Gram)",
    rateKey: "gold24K",
    diffKey: "diffGold24K",
    trendKey: "diffStatusGold24K",
  },
  {
    label: "Gold 22K",
    rateKey: "gold22K",
    diffKey: "diffGold22K",
    trendKey: "diffStatusGold22K",
  },
  {
    label: "Gold 18K",
    rateKey: "gold18K",
    diffKey: "diffGold18K",
    trendKey: "diffStatusGold18K",
  },
  {
    label: "Silver",
    rateKey: "silver",
    diffKey: "diffSilver",
    trendKey: "diffStatusSilver",
  },
];

function getTrendClass(trend) {
  if (trend === "up") return "up";
  if (trend === "down") return "down";
  return "neutral";
}

function formatChangeText(value) {
  const trimmed = String(value ?? "0").trim();
  if (!trimmed || trimmed === "0" || trimmed === "0.0") return "No change";
  return trimmed;
}

function renderCards(payload) {
  ratesGridEl.innerHTML = "";

  cardsConfig.forEach((cfg, index) => {
    const node = cardTemplate.content.cloneNode(true);
    const card = node.querySelector(".rate-card");
    const label = node.querySelector(".rate-label");
    const value = node.querySelector(".rate-value");
    const chip = node.querySelector(".chip");
    const trend = node.querySelector(".trend");

    const trendRaw = payload[cfg.trendKey];
    const trendClass = getTrendClass(trendRaw);
    const changeText = formatChangeText(payload[cfg.diffKey]);

    card.style.animationDelay = `${index * 90}ms`;
    label.textContent = cfg.label;
    value.textContent = payload[cfg.rateKey] ?? "--";

    chip.classList.add(trendClass);
    chip.textContent = changeText;

    trend.classList.add(trendClass);
    trend.textContent = trendRaw ? trendRaw.toUpperCase() : "STABLE";

    ratesGridEl.appendChild(node);
  });
}

async function loadRates() {
  statusEl.textContent = "Loading latest rates...";
  refreshBtn.disabled = true;

  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const details = data?.details?.[0];

    if (!details) {
      throw new Error("Missing details in API response");
    }

    renderCards(details);
    updatedDateEl.textContent = `Updated: ${details.date ?? data.date ?? "--"}`;
    statusEl.textContent = "Latest rates loaded.";
  } catch (error) {
    ratesGridEl.innerHTML = "";
    statusEl.textContent = `Could not load rates (${error.message}). If this page is opened as a local file, run a local server to avoid browser CORS restrictions.`;
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", loadRates);
loadRates();
