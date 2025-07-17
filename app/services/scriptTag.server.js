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
      // Update timestamp for existing ScriptTag
      const updated = await prisma.scriptTag.update({
        where: { shop },
        data: { lastInstallAt: new Date() }
      });
      return updated;
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

    // Save to database with install timestamp
    const saved = await prisma.scriptTag.create({
      data: {
        shop,
        scriptTagId,
        src,
        lastInstallAt: new Date()
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
 * Force reinstall ScriptTag (delete and recreate)
 */
export async function forceReinstallScriptTag(admin, shop) {
  try {
    // First try to delete existing
    try {
      await deleteScriptTag(admin, shop);
      console.log('Smart Sticky: Existing ScriptTag deleted for force reinstall');
    } catch (deleteError) {
      console.log('Smart Sticky: No existing ScriptTag to delete or deletion failed:', deleteError.message);
    }
    
    // Wait a moment before recreating
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create new one
    const result = await createScriptTag(admin, shop);
    console.log('Smart Sticky: ScriptTag force reinstalled successfully');
    return result;
  } catch (error) {
    console.error('Error force reinstalling ScriptTag:', error);
    throw error;
  }
}

/**
 * Revalidate ScriptTag (check if it exists in Shopify and recreate if missing)
 */
export async function revalidateScriptTag(admin, shop) {
  try {
    const localScriptTag = await getExistingScriptTag(shop);
    if (!localScriptTag) {
      console.log('Smart Sticky: No local ScriptTag found, creating new one');
      return await createScriptTag(admin, shop);
    }
    
    // Get all ScriptTags from Shopify
    const allScriptTags = await listScriptTags(admin);
    const expectedSrc = getScriptTagSrc();
    
    // Check if our ScriptTag exists in Shopify
    const existsInShopify = allScriptTags.some(tag => 
      tag.id.includes(localScriptTag.scriptTagId) || tag.src === expectedSrc
    );
    
    if (!existsInShopify) {
      console.log('Smart Sticky: ScriptTag not found in Shopify, recreating...');
      // Remove from local DB and recreate
      await prisma.scriptTag.delete({ where: { shop } });
      return await createScriptTag(admin, shop);
    }
    
    // Check if URL changed
    const shopifyScriptTag = allScriptTags.find(tag => 
      tag.id.includes(localScriptTag.scriptTagId)
    );
    
    if (shopifyScriptTag && shopifyScriptTag.src !== expectedSrc) {
      console.log('Smart Sticky: ScriptTag URL changed, updating...');
      return await forceReinstallScriptTag(admin, shop);
    }
    
    // Update timestamp for successful revalidation
    const updated = await prisma.scriptTag.update({
      where: { shop },
      data: { lastInstallAt: new Date() }
    });
    
    console.log('Smart Sticky: ScriptTag revalidated successfully');
    return updated;
  } catch (error) {
    console.error('Error revalidating ScriptTag:', error);
    throw error;
  }
}