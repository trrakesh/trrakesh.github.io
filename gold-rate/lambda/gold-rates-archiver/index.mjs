import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const TARGET_URL =
  process.env.TARGET_URL ||
  "https://appdata.manoramaonline.com/common/MMOnlineVipani/gold/goldRate.json";
const BUCKET_NAME = process.env.BUCKET_NAME;
const PREFIX = process.env.PREFIX || "gold-rates";
const LATEST_OBJECT_KEY = process.env.LATEST_OBJECT_KEY || `${PREFIX}/latest.json`;
const MAX_HISTORY_POINTS = Number.parseInt(process.env.MAX_HISTORY_POINTS || "365", 10);
const STORE_DAILY_SNAPSHOT =
  String(process.env.STORE_DAILY_SNAPSHOT ?? "true").toLowerCase() !== "false";

const s3 = new S3Client({});

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function parseNumber(value) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function pointFromPayload(payload) {
  const details = payload?.details?.[0] || {};
  return {
    date: details.date || payload?.date || todayDateString(),
    gold24K: parseNumber(details.gold24K),
    gold22K: parseNumber(details.gold22K),
    gold18K: parseNumber(details.gold18K),
    silver: parseNumber(details.silver),
  };
}

function normalizeSeries(existingData) {
  if (Array.isArray(existingData?.series)) {
    return existingData.series
      .filter((item) => item?.date)
      .map((item) => ({
        date: item.date,
        gold24K: parseNumber(item.gold24K),
        gold22K: parseNumber(item.gold22K),
        gold18K: parseNumber(item.gold18K),
        silver: parseNumber(item.silver),
      }));
  }

  if (existingData?.details?.[0] || existingData?.date) {
    return [pointFromPayload(existingData)];
  }

  return [];
}

async function readExistingJson() {
  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: LATEST_OBJECT_KEY,
      })
    );
    const text = await object.Body.transformToString();
    return JSON.parse(text);
  } catch (error) {
    if (error?.name === "NoSuchKey") {
      return null;
    }
    throw error;
  }
}

export const handler = async () => {
  if (!BUCKET_NAME) {
    throw new Error("Missing required environment variable: BUCKET_NAME");
  }

  const upstream = await fetch(TARGET_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!upstream.ok) {
    throw new Error(`Upstream API returned HTTP ${upstream.status}`);
  }

  const payload = await upstream.json();
  const existingData = await readExistingJson();
  const series = normalizeSeries(existingData);
  const newPoint = pointFromPayload(payload);

  const dedupedSeries = series.filter((item) => item.date !== newPoint.date);
  dedupedSeries.push(newPoint);
  dedupedSeries.sort((a, b) => a.date.localeCompare(b.date));

  const boundedSeries = dedupedSeries.slice(-Math.max(MAX_HISTORY_POINTS, 1));
  const latestPayload = {
    updatedAt: new Date().toISOString(),
    latestDate: newPoint.date,
    source: TARGET_URL,
    series: boundedSeries,
  };

  const snapshotDate = payload?.date || payload?.details?.[0]?.date || todayDateString();
  const datedKey = `${PREFIX}/${snapshotDate}.json`;
  const body = JSON.stringify(latestPayload, null, 2);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: LATEST_OBJECT_KEY,
      Body: body,
      ContentType: "application/json",
    })
  );

  if (STORE_DAILY_SNAPSHOT) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: datedKey,
        Body: body,
        ContentType: "application/json",
      })
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Snapshot saved",
      bucket: BUCKET_NAME,
      latestKey: LATEST_OBJECT_KEY,
      seriesCount: boundedSeries.length,
      datedKey: STORE_DAILY_SNAPSHOT ? datedKey : null,
    }),
  };
};
