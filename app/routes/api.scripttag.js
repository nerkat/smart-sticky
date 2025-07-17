// app/routes/api.scripttag.js
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createScriptTag, deleteScriptTag, getExistingScriptTag, listScriptTags } from "../services/scriptTag.server";

export async function loader({ request }) {
  try {
    const { admin, session } = await authenticate.admin(request);
    const url = new URL(request.url);
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
    return json({ error: error.message }, { status: 500 });
  }
}

export async function action({ request }) {
  try {
    const { admin, session } = await authenticate.admin(request);
    const formData = await request.formData();
    const action = formData.get("action");

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
    return json({ error: error.message }, { status: 500 });
  }
}