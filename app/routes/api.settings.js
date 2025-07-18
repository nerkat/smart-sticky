// app/routes/api.settings.js
import { json } from "@remix-run/node";
import { getSession } from "../shopify.server";
import prisma from "../db.server";

// Default settings for when none are found
const DEFAULT_SETTINGS = {
  enabled: true,
  position: "bottom",
  offset: 100,
};

export async function loader({ request }) {
  // Handle CORS for cross-origin requests from the sticky bar script
  const origin = request.headers.get("origin");
  const headers = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const isDev = process.env.NODE_ENV === "development";
  const url = new URL(request.url);
  const themeId = url.searchParams.get("themeId") || "main";

  try {
    // For development, use a mock session
    const session = isDev ? { shop: "dev-shop.myshopify.com" } : (await getSession(request)).session;
    
    // Extract shop from referrer if not available in session
    let shop = session?.shop;
    if (!shop && !isDev) {
      const referrer = request.headers.get("referer");
      if (referrer) {
        const referrerUrl = new URL(referrer);
        shop = referrerUrl.hostname;
      }
    }

    if (!shop) {
      return json({ settings: DEFAULT_SETTINGS }, { headers });
    }

    const settings = await prisma.stickySettings.findUnique({
      where: {
        shop_themeId: {
          shop,
          themeId,
        },
      },
    });

    // Return settings with defaults if not found
    const settingsWithDefaults = settings || {
      ...DEFAULT_SETTINGS,
      shop,
      themeId,
    };

    return json({ settings: settingsWithDefaults }, { headers });
  } catch (error) {
    console.error("Error loading settings:", error);
    return json({ settings: DEFAULT_SETTINGS }, { headers });
  }
}

// Handle OPTIONS requests for CORS
export async function options({ request }) {
  const origin = request.headers.get("origin");
  const headers = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  
  return new Response(null, { status: 200, headers });
}

export async function action({ request }) {
  const isDev = process.env.NODE_ENV === "development";
  const session = isDev ? { shop: "dev-shop.myshopify.com" } : (await getSession(request)).session;
  
  let body;
  const contentType = request.headers.get("content-type");
  
  if (contentType && contentType.includes("application/json")) {
    body = await request.json();
  } else {
    // Handle form data from Remix fetcher
    const formData = await request.formData();
    body = {
      themeId: formData.get("themeId"),
      enabled: formData.get("enabled") === "true",
      position: formData.get("position"),
      offset: Number(formData.get("offset")),
    };
  }
  
  const { themeId, enabled, position, offset } = body;
  console.log("Saving settings:", { themeId, enabled, position, offset, shop: session.shop });

  if (!themeId) return json({ error: "Missing themeId" }, { status: 400 });

  // Validate settings with defaults
  const validatedSettings = {
    enabled: enabled !== undefined ? enabled : DEFAULT_SETTINGS.enabled,
    position: position || DEFAULT_SETTINGS.position,
    offset: offset !== undefined ? offset : DEFAULT_SETTINGS.offset,
  };

  // Validate position values
  if (!["top", "bottom"].includes(validatedSettings.position)) {
    return json({ error: "Invalid position. Must be 'top' or 'bottom'" }, { status: 400 });
  }

  // Validate offset range
  if (validatedSettings.offset < 0 || validatedSettings.offset > 500) {
    return json({ error: "Invalid offset. Must be between 0 and 500" }, { status: 400 });
  }

  const saved = await prisma.stickySettings.upsert({
    where: {
      shop_themeId: {
        shop: session.shop,
        themeId,
      },
    },
    update: validatedSettings,
    create: {
      shop: session.shop,
      themeId,
      ...validatedSettings,
    },
  });

  console.log("Settings saved to database:", saved);
  return json({ success: true, saved });
}