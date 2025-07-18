import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    // Clean up all app data for this shop
    try {
      // Remove all sessions for this shop
      await db.session.deleteMany({ where: { shop } });
      console.log(`Cleaned up sessions for shop ${shop}`);
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
    
    // Clean up ScriptTag records from our database
    // Note: The actual ScriptTag in Shopify is automatically removed when app is uninstalled
    try {
      const deletedScriptTags = await db.scriptTag.deleteMany({ where: { shop } });
      console.log(`Cleaned up ${deletedScriptTags.count} ScriptTag records for shop ${shop}`);
    } catch (error) {
      console.error('Error cleaning up ScriptTag records:', error);
    }

    // Clean up StickySettings records from our database
    try {
      const deletedSettings = await db.stickySettings.deleteMany({ where: { shop } });
      console.log(`Cleaned up ${deletedSettings.count} StickySettings records for shop ${shop}`);
    } catch (error) {
      console.error('Error cleaning up StickySettings records:', error);
    }

    console.log(`Complete cleanup finished for shop ${shop}`);
  }

  return new Response();
};
