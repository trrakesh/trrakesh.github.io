const API_URL =
  window.GOLD_API_URL ||
  "https://appdata.manoramaonline.com/common/MMOnlineVipani/gold/goldRate.json";
const HISTORY_API_URL =
  window.GOLD_HISTORY_API_URL ||
  API_URL.replace(/\/gold-rete$/, "/gold-history");

const statusEl = document.getElementById("status");
const ratesGridEl = document.getElementById("ratesGrid");
const updatedDateEl = document.getElementById("updatedDate");
const refreshBtn = document.getElementById("refreshBtn");
const cardTemplate = document.getElementById("rateCardTemplate");
const chartStatusEl = document.getElementById("chartStatus");
const historyChartEl = document.getElementById("historyChart");

let historyChart;

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

function parseNumber(value) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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

function renderHistoryChart(series) {
  if (!historyChartEl || !window.Chart) return;

  const labels = series.map((item) => item.date);
  const gold22 = series.map((item) => item.gold22K);
  const gold18 = series.map((item) => item.gold18K);
  const silver = series.map((item) => item.silver);

  if (historyChart) {
    historyChart.destroy();
  }

  historyChart = new Chart(historyChartEl, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Gold 22K",
          data: gold22,
          borderColor: "#b98a28",
          backgroundColor: "rgba(185, 138, 40, 0.15)",
          tension: 0.32,
          pointRadius: 2,
        },
        {
          label: "Gold 18K",
          data: gold18,
          borderColor: "#875f11",
          backgroundColor: "rgba(135, 95, 17, 0.13)",
          tension: 0.32,
          pointRadius: 2,
        },
        {
          label: "Silver",
          data: silver,
          borderColor: "#6f7f89",
          backgroundColor: "rgba(111, 127, 137, 0.13)",
          tension: 0.32,
          pointRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: false,
          ticks: {
            callback: (value) => value.toLocaleString("en-IN"),
          },
        },
      },
    },
  });
}

async function loadHistory() {
  if (!chartStatusEl) return;
  chartStatusEl.textContent = "Loading chart data...";

  try {
    const response = await fetch(`${HISTORY_API_URL}?limit=30`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const series = (data?.series || []).map((item) => ({
      date: item.date,
      gold22K: parseNumber(item.gold22K),
      gold18K: parseNumber(item.gold18K),
      silver: parseNumber(item.silver),
    }));

    if (!series.length) {
      chartStatusEl.textContent = "No historical data yet. Daily snapshots will appear after scheduled runs.";
      return;
    }

    renderHistoryChart(series);
    chartStatusEl.textContent = `Showing ${series.length} days of history.`;
  } catch (error) {
    chartStatusEl.textContent = `Could not load chart data (${error.message}).`;
  }
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

async function refreshAll() {
  await Promise.all([loadRates(), loadHistory()]);
}

refreshBtn.addEventListener("click", refreshAll);
refreshAll();
