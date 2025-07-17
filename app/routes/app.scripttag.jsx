import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getExistingScriptTag, listScriptTags } from "../services/scriptTag.server";
import { StickyStatusCard } from "../components/StickyStatusCard";

export const loader = async ({ request }) => {
  try {
    // Add defensive check for session
    const authResult = await authenticate.admin(request);
    
    if (!authResult?.session) {
      console.error('Authentication failed in scripttag loader - no session');
      return json({
        shop: null,
        scriptTag: null,
        installed: false,
        allScriptTags: [],
        error: "Authentication required",
      });
    }

    const { admin, session } = authResult;
    const scriptTag = await getExistingScriptTag(session.shop);
    
    // Get all ScriptTags for debugging/validation
    let allScriptTags = [];
    try {
      allScriptTags = await listScriptTags(admin);
    } catch (error) {
      console.warn('Failed to fetch all ScriptTags:', error.message);
    }
    
    return json({
      shop: session.shop,
      scriptTag,
      installed: !!scriptTag,
      allScriptTags,
    });
  } catch (error) {
    console.error("Error loading ScriptTag status:", error);
    return json({
      shop: null,
      scriptTag: null,
      installed: false,
      allScriptTags: [],
      error: error.message,
    });
  }
};

export default function ScriptTagManagement() {
  const { shop, scriptTag, installed, allScriptTags, error } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [isAppReady, setIsAppReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const isLoading = fetcher.state !== "idle";

  // Track hydration to prevent hydration mismatches
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Track App Bridge readiness to ensure session is available
  useEffect(() => {
    if (!shopify) return;

    const checkAppReadiness = async () => {
      try {
        // Check if App Bridge is ready and can access shop context
        const shopDomain = await shopify.getShopDomain?.();
        if (shopDomain) {
          setIsAppReady(true);
        } else {
          // Fallback: assume ready after a short delay if getShopDomain is not available
          setTimeout(() => setIsAppReady(true), 1000);
        }
      } catch (error) {
        console.warn("App Bridge readiness check failed, defaulting to ready:", error);
        // Default to ready after delay to avoid indefinite blocking
        setTimeout(() => setIsAppReady(true), 1500);
      }
    };

    checkAppReadiness();
  }, [shopify]);

  // Retry mechanism for failed operations
  useEffect(() => {
    if (fetcher.data?.error && fetcher.data.error.includes("Session expired")) {
      // Auto-retry after session errors by reloading loader data
      const retryTimer = setTimeout(() => {
        window.location.reload();
      }, 3000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [fetcher.data]);

  const handleInstall = () => {
    if (!isAppReady || !isHydrated) {
      shopify?.toast?.show("Please wait for the app to fully load...");
      return;
    }
    fetcher.submit({ action: "install" }, { method: "POST", action: "/api/scripttag" });
  };

  const handleUninstall = () => {
    if (!isAppReady || !isHydrated) {
      shopify?.toast?.show("Please wait for the app to fully load...");
      return;
    }
    fetcher.submit({ action: "uninstall" }, { method: "POST", action: "/api/scripttag" });
  };

  const handleForceReinstall = () => {
    if (!isAppReady || !isHydrated) {
      shopify?.toast?.show("Please wait for the app to fully load...");
      return;
    }
    fetcher.submit({ action: "force-reinstall" }, { method: "POST", action: "/api/scripttag" });
  };

  const handleRevalidate = () => {
    if (!isAppReady || !isHydrated) {
      shopify?.toast?.show("Please wait for the app to fully load...");
      return;
    }
    fetcher.submit({ action: "revalidate" }, { method: "POST", action: "/api/scripttag" });
  };

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <Page>
        <TitleBar title="ScriptTag Management" />
        <BlockStack gap="500">
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Loading...
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar title="ScriptTag Management" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <StickyStatusCard
              shop={shop}
              scriptTag={scriptTag}
              installed={installed}
              error={error}
              apiError={fetcher.data?.error}
              isLoading={isLoading}
              isAppReady={isAppReady}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
              onForceReinstall={handleForceReinstall}
              onRevalidate={handleRevalidate}
              success={fetcher.data?.success ? "Operation completed successfully!" : undefined}
            />
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  How it works
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    1. ScriptTag is automatically installed when your app is installed
                  </Text>
                  <Text as="p" variant="bodyMd">
                    2. The script loads on product pages only (/products/*)
                  </Text>
                  <Text as="p" variant="bodyMd">
                    3. Detects cart forms and add-to-cart buttons
                  </Text>
                  <Text as="p" variant="bodyMd">
                    4. Shows a sticky bar when the original form scrolls out of view
                  </Text>
                  <Text as="p" variant="bodyMd">
                    5. Clones form content for variant selection and quantity
                  </Text>
                  <Text as="p" variant="bodyMd">
                    6. ScriptTag is automatically removed when the app is uninstalled
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          {allScriptTags && allScriptTags.length > 0 && (
            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    All ScriptTags ({allScriptTags.length})
                  </Text>
                  <BlockStack gap="200">
                    {allScriptTags.map((tag, index) => (
                      <div key={tag.id} style={{ 
                        padding: '12px', 
                        background: '#f9f9f9', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        <div><strong>#{index + 1}</strong></div>
                        <div><strong>ID:</strong> {tag.id}</div>
                        <div><strong>Source:</strong> {tag.src}</div>
                        <div><strong>Scope:</strong> {tag.displayScope}</div>
                        <div><strong>Created:</strong> {new Date(tag.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </BlockStack>
    </Page>
  );
}
