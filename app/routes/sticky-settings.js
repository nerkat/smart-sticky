// app/routes/api/sticky-settings.js
import { json } from "@remix-run/node";
import { getSession } from "../shopify.server";
import { prisma } from "../db.server";

export async function loader({ request }) {
  const { session } = await getSession(request);
  const url = new URL(request.url);
  const themeId = url.searchParams.get("themeId");

  if (!themeId) return json({ error: "Missing themeId" }, { status: 400 });

  const settings = await prisma.stickySettings.findUnique({
    where: {
      shop_themeId: {
        shop: session.shop,
        themeId,
      },
    },
  });

  return json({ settings });
}

export async function action({ request }) {
  const { session } = await getSession(request);
  const body = await request.json();
  const { themeId, enabled, position, offset } = body;

  if (!themeId) return json({ error: "Missing themeId" }, { status: 400 });

  const saved = await prisma.stickySettings.upsert({
    where: {
      shop_themeId: {
        shop: session.shop,
        themeId,
      },
    },
    update: {
      enabled,
      position,
      offset,
    },
    create: {
      shop: session.shop,
      themeId,
      enabled,
      position,
      offset,
    },
  });

  return json({ success: true, saved });
}
