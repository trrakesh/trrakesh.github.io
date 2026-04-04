const TARGET_URL = "https://appdata.manoramaonline.com/common/MMOnlineVipani/gold/goldRate.json";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

export const handler = async (event) => {
  const method =
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    "GET";

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (method !== "GET") {
    return response(405, {
      message: "Method not allowed. Use GET.",
    });
  }

  try {
    const upstream = await fetch(TARGET_URL, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return response(502, {
        message: "Upstream API returned an error",
        status: upstream.status,
      });
    }

    const data = await upstream.json();
    return response(200, data);
  } catch (error) {
    return response(500, {
      message: "Failed to fetch upstream API",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
