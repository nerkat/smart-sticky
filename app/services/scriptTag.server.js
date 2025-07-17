// app/services/scriptTag.server.js
import prisma from "../db.server";

/**
 * Get the base URL for the app
 */
function getAppUrl() {
  return process.env.SHOPIFY_APP_URL || "https://lemon-fence-handheld-via.trycloudflare.com";
}

/**
 * Get the ScriptTag source URL
 */
function getScriptTagSrc() {
  return `${getAppUrl()}/stickybar.js`;
}

/**
 * Check if a ScriptTag already exists for a shop
 */
export async function getExistingScriptTag(shop) {
  return await prisma.scriptTag.findUnique({
    where: { shop }
  });
}

/**
 * Create a ScriptTag via Shopify Admin API
 */
export async function createScriptTag(admin, shop) {
  try {
    // Validate inputs
    if (!admin) {
      throw new Error("Admin API client is required");
    }
    if (!shop) {
      throw new Error("Shop domain is required");
    }

    // Check if already exists in our database
    const existing = await getExistingScriptTag(shop);
    if (existing) {
      console.log(`ScriptTag already exists for shop ${shop}:`, existing.scriptTagId);
      return existing;
    }

    // Create ScriptTag via GraphQL
    const src = getScriptTagSrc();
    const response = await admin.graphql(`
      mutation scriptTagCreate($input: ScriptTagInput!) {
        scriptTagCreate(input: $input) {
          scriptTag {
            id
            src
            displayScope
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        input: {
          src,
          displayScope: "ONLINE_STORE"
        }
      }
    });

    const result = await response.json();

    if (!result || !result.data) {
      throw new Error("Invalid response from Shopify API");
    }

    const { data } = result;

    if (data.scriptTagCreate.userErrors.length > 0) {
      console.error('ScriptTag creation errors:', data.scriptTagCreate.userErrors);
      throw new Error(`Failed to create ScriptTag: ${data.scriptTagCreate.userErrors[0].message}`);
    }

    const scriptTag = data.scriptTagCreate.scriptTag;

    if (!scriptTag || !scriptTag.id) {
      throw new Error("ScriptTag creation returned invalid data");
    }

    const scriptTagId = scriptTag.id.replace('gid://shopify/ScriptTag/', '');

    // Save to database
    const saved = await prisma.scriptTag.create({
      data: {
        shop,
        scriptTagId,
        src,
        lastInstalled: new Date(),
        lastValidated: new Date()
      }
    });

    console.log(`ScriptTag created for shop ${shop}:`, scriptTagId);
    return saved;
  } catch (error) {
    console.error('Error creating ScriptTag:', error);
    // Re-throw with more context if it's a generic error
    if (error.message === "Unauthorized" || error.message.includes("401")) {
      throw new Error("Session expired or invalid. Please refresh the page.");
    }
    throw error;
  }
}

/**
 * Delete a ScriptTag via Shopify Admin API
 */
export async function deleteScriptTag(admin, shop) {
  try {
    // Validate inputs
    if (!admin) {
      throw new Error("Admin API client is required");
    }
    if (!shop) {
      throw new Error("Shop domain is required");
    }

    const existing = await getExistingScriptTag(shop);
    if (!existing) {
      console.log(`No ScriptTag found for shop ${shop}`);
      return null;
    }

    // Delete from Shopify
    const response = await admin.graphql(`
      mutation scriptTagDelete($id: ID!) {
        scriptTagDelete(id: $id) {
          deletedScriptTagId
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        id: `gid://shopify/ScriptTag/${existing.scriptTagId}`
      }
    });

    const result = await response.json();

    if (!result || !result.data) {
      throw new Error("Invalid response from Shopify API");
    }

    const { data } = result;

    if (data.scriptTagDelete.userErrors.length > 0) {
      console.error('ScriptTag deletion errors:', data.scriptTagDelete.userErrors);
      throw new Error(`Failed to delete ScriptTag: ${data.scriptTagDelete.userErrors[0].message}`);
    }

    // Remove from database
    await prisma.scriptTag.delete({
      where: { shop }
    });

    console.log(`ScriptTag deleted for shop ${shop}:`, existing.scriptTagId);
    return existing;
  } catch (error) {
    console.error('Error deleting ScriptTag:', error);
    // Re-throw with more context if it's a generic error
    if (error.message === "Unauthorized" || error.message.includes("401")) {
      throw new Error("Session expired or invalid. Please refresh the page.");
    }
    throw error;
  }
}

/**
 * List all ScriptTags for debugging
 */
export async function listScriptTags(admin) {
  try {
    const response = await admin.graphql(`
      query {
        scriptTags(first: 100) {
          edges {
            node {
              id
              src
              displayScope
              createdAt
            }
          }
        }
      }
    `);

    const { data } = await response.json();
    if (!data?.scriptTags?.edges) {
      console.error("No script tags found or API returned unexpected response:", data);
      return [];
    }

    return data.scriptTags.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Error listing ScriptTags:', error);
    throw error;
  }
}

/**
 * Check if ScriptTag exists in Shopify and update validation timestamp
 */
export async function validateScriptTag(admin, shop) {
  try {
    const existing = await getExistingScriptTag(shop);
    if (!existing) {
      return { exists: false, scriptTag: null };
    }

    // Check if it still exists in Shopify
    const scriptTags = await listScriptTags(admin);
    const shopifyScriptTag = scriptTags.find(st => 
      st.id.replace('gid://shopify/ScriptTag/', '') === existing.scriptTagId
    );

    // Update validation timestamp
    const updated = await prisma.scriptTag.update({
      where: { shop },
      data: { lastValidated: new Date() }
    });

    return { 
      exists: !!shopifyScriptTag, 
      scriptTag: updated,
      shopifyScriptTag 
    };
  } catch (error) {
    console.error('Error validating ScriptTag:', error);
    throw error;
  }
}

/**
 * Force reinstall ScriptTag (delete and recreate)
 */
export async function forceReinstallScriptTag(admin, shop) {
  try {
    // Try to delete existing first (ignore errors)
    try {
      await deleteScriptTag(admin, shop);
    } catch (deleteError) {
      console.warn('Error during deletion in force reinstall (continuing):', deleteError);
    }

    // Create new one
    const result = await createScriptTag(admin, shop);
    console.log(`ScriptTag force reinstalled for shop ${shop}`);
    return result;
  } catch (error) {
    console.error('Error force reinstalling ScriptTag:', error);
    throw error;
  }
}

// TODO: Add webhook handlers for app uninstall events
// This would automatically clean up ScriptTags when the app is uninstalled
// Webhook endpoint: /webhooks/app/uninstalled
// Should call deleteScriptTag to clean up Shopify ScriptTags
// and remove DB records for the uninstalled shop

/**
 * Revalidate and repair ScriptTag if needed
 */
export async function revalidateAndRepair(admin, shop) {
  try {
    const validation = await validateScriptTag(admin, shop);
    
    if (!validation.exists && validation.scriptTag) {
      // ScriptTag exists in DB but not in Shopify - recreate it
      console.log(`ScriptTag missing in Shopify for shop ${shop}, recreating...`);
      return await forceReinstallScriptTag(admin, shop);
    }

    if (validation.exists && validation.scriptTag) {
      // Check if URL changed
      const currentSrc = getScriptTagSrc();
      if (validation.shopifyScriptTag?.src !== currentSrc) {
        console.log(`ScriptTag URL changed for shop ${shop}, updating...`);
        return await forceReinstallScriptTag(admin, shop);
      }
    }

    return validation.scriptTag;
  } catch (error) {
    console.error('Error revalidating ScriptTag:', error);
    throw error;
  }
}