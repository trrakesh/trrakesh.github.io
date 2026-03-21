import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const TARGET_URL =
  process.env.TARGET_URL ||
  "https://appdata.manoramaonline.com/common/MMOnlineVipani/gold/goldRate.json";
const BUCKET_NAME = process.env.BUCKET_NAME;
const PREFIX = process.env.PREFIX || "gold-rates";
const LATEST_OBJECT_KEY = process.env.LATEST_OBJECT_KEY || `${PREFIX}/latest.json`;
const STORE_DAILY_SNAPSHOT =
  String(process.env.STORE_DAILY_SNAPSHOT ?? "true").toLowerCase() !== "false";

const s3 = new S3Client({});

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
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
  const snapshotDate = payload?.date || payload?.details?.[0]?.date || todayDateString();
  const datedKey = `${PREFIX}/${snapshotDate}.json`;
  const body = JSON.stringify(payload, null, 2);

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
      datedKey: STORE_DAILY_SNAPSHOT ? datedKey : null,
    }),
  };
};
