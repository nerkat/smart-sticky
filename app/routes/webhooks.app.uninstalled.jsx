import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
    
    // Clean up ScriptTag records from our database
    // Note: The actual ScriptTag in Shopify is automatically removed when app is uninstalled
    try {
      const deleted = await db.scriptTag.deleteMany({ where: { shop } });
      console.log(`Cleaned up ${deleted.count} ScriptTag records for shop ${shop}`);
    } catch (error) {
      console.error('Error cleaning up ScriptTag records:', error);
    }
  }

  return new Response();
};
