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
            event
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
          event: "ONLOAD",
          displayScope: "ONLINE_STORE"
        }
      }
    });

    const { data } = await response.json();
    
    if (data.scriptTagCreate.userErrors.length > 0) {
      console.error('ScriptTag creation errors:', data.scriptTagCreate.userErrors);
      throw new Error(`Failed to create ScriptTag: ${data.scriptTagCreate.userErrors[0].message}`);
    }

    const scriptTag = data.scriptTagCreate.scriptTag;
    const scriptTagId = scriptTag.id.replace('gid://shopify/ScriptTag/', '');

    // Save to database
    const saved = await prisma.scriptTag.create({
      data: {
        shop,
        scriptTagId,
        src,
        event: "onload"
      }
    });

    console.log(`ScriptTag created for shop ${shop}:`, scriptTagId);
    return saved;
  } catch (error) {
    console.error('Error creating ScriptTag:', error);
    throw error;
  }
}

/**
 * Delete a ScriptTag via Shopify Admin API
 */
export async function deleteScriptTag(admin, shop) {
  try {
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

    const { data } = await response.json();
    
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
              event
              displayScope
              createdAt
            }
          }
        }
      }
    `);

    const { data } = await response.json();
    return data.scriptTags.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Error listing ScriptTags:', error);
    throw error;
  }
}