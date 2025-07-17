// app/routes/api.scripttag.js
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createScriptTag, deleteScriptTag, getExistingScriptTag, listScriptTags } from "../services/scriptTag.server";

export async function loader({ request }) {
  try {
    // Add defensive check for session
    const url = new URL(request.url);
    const authResult = await authenticate.admin(request);
    
    if (!authResult?.admin || !authResult?.session) {
      console.error('Authentication failed in scripttag loader - no admin or session');
      return json({ error: "Authentication required" }, { status: 401 });
    }

    const { admin, session } = authResult;
    const action = url.searchParams.get("action");

    switch (action) {
      case "list": {
        const scriptTags = await listScriptTags(admin);
        const existing = await getExistingScriptTag(session.shop);
        return json({ scriptTags, existing });
      }
      case "status": {
        const existing = await getExistingScriptTag(session.shop);
        return json({ existing, installed: !!existing });
      }
      default: {
        const existing = await getExistingScriptTag(session.shop);
        return json({ existing, installed: !!existing });
      }
    }
  } catch (error) {
    console.error('Error in ScriptTag API loader:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      return json({ error: "Session expired. Please refresh the page." }, { status: 401 });
    }
    
    return json({ error: error.message }, { status: 500 });
  }
}

export async function action({ request }) {
  try {
    // Add defensive check for session
    const authResult = await authenticate.admin(request);
    
    if (!authResult?.admin || !authResult?.session) {
      console.error('Authentication failed in scripttag action - no admin or session');
      return json({ error: "Authentication required" }, { status: 401 });
    }

    const { admin, session } = authResult;
    const formData = await request.formData();
    const action = formData.get("action");

    // Additional validation
    if (!session.shop) {
      console.error('No shop found in session');
      return json({ error: "Invalid session - no shop found" }, { status: 400 });
    }

    switch (action) {
      case "install": {
        const result = await createScriptTag(admin, session.shop);
        return json({ success: true, scriptTag: result });
      }
      case "uninstall": {
        const result = await deleteScriptTag(admin, session.shop);
        return json({ success: true, deleted: result });
      }
      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in ScriptTag API action:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      return json({ error: "Session expired. Please refresh the page." }, { status: 401 });
    }
    
    // Check for specific Shopify API errors
    if (error.message?.includes('GraphQL')) {
      return json({ error: `Shopify API error: ${error.message}` }, { status: 422 });
    }
    
    return json({ error: error.message }, { status: 500 });
  }
}