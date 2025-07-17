import { authenticate } from "../shopify.server";
import { createScriptTag } from "../services/scriptTag.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // Check if this is a fresh installation by looking for ScriptTag
  try {
    console.log(`Smart Sticky: OAuth callback for shop ${session.shop}`);
    
    // Try to create ScriptTag (will skip if already exists)
    await createScriptTag(admin, session.shop);
  } catch (error) {
    console.error('Error during ScriptTag installation:', error);
    // Don't fail the OAuth flow for ScriptTag errors
  }

  return null;
};
