import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const BUCKET_NAME = process.env.BUCKET_NAME;
const PREFIX = process.env.PREFIX || "gold-rates";
const LATEST_OBJECT_KEY = process.env.LATEST_OBJECT_KEY || `${PREFIX}/latest.json`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const s3 = new S3Client({});

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function parseNumber(value) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

async function readJsonObject(key) {
  const object = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );

  const text = await object.Body.transformToString();
  return JSON.parse(text);
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (method !== "GET") {
    return response(405, { message: "Method not allowed. Use GET." });
  }

  if (!BUCKET_NAME) {
    return response(500, { message: "Missing BUCKET_NAME environment variable" });
  }

  try {
    const data = await readJsonObject(LATEST_OBJECT_KEY);
    const details = data?.details?.[0] || {};
    const date = details.date || data?.date || new Date().toISOString().slice(0, 10);

    const series = [
      {
        date,
        gold24K: parseNumber(details.gold24K),
        gold22K: parseNumber(details.gold22K),
        gold18K: parseNumber(details.gold18K),
        silver: parseNumber(details.silver),
      },
    ];

    return response(200, {
      bucket: BUCKET_NAME,
      key: LATEST_OBJECT_KEY,
      count: series.length,
      series,
    });
  } catch (error) {
    return response(500, {
      message: "Failed to read historical data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
