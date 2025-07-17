import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  InlineStack,
  Badge,
  Box,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getExistingScriptTag, revalidateAndRepair } from "../services/scriptTag.server";
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
        error: "Authentication required",
      });
    }

    const { session, admin } = authResult;
    
    // Revalidate and repair ScriptTag on page load
    try {
      const scriptTag = await revalidateAndRepair(admin, session.shop);
      return json({
        shop: session.shop,
        scriptTag,
        installed: !!scriptTag,
        revalidated: true,
      });
    } catch (revalidateError) {
      console.warn('Revalidation failed, falling back to basic check:', revalidateError);
      const scriptTag = await getExistingScriptTag(session.shop);
      return json({
        shop: session.shop,
        scriptTag,
        installed: !!scriptTag,
        revalidated: false,
      });
    }
  } catch (error) {
    console.error("Error loading ScriptTag status:", error);
    return json({
      shop: null,
      scriptTag: null,
      installed: false,
      error: error.message,
    });
  }
};

export default function ScriptTagManagement() {
  const { shop, scriptTag, installed, error, revalidated } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [isAppReady, setIsAppReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [allScriptTags, setAllScriptTags] = useState([]);
  
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

  // Load all ScriptTags on mount
  useEffect(() => {
    if (isAppReady && isHydrated) {
      fetchAllScriptTags();
    }
  }, [isAppReady, isHydrated]);

  const fetchAllScriptTags = () => {
    fetcher.load("/api/scripttag?action=list");
  };

  // Update allScriptTags when fetcher data changes
  useEffect(() => {
    if (fetcher.data?.scriptTags) {
      setAllScriptTags(fetcher.data.scriptTags);
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
              installed={installed}
              scriptTag={scriptTag}
              error={error}
              shop={shop}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
              onForceReinstall={handleForceReinstall}
              isLoading={isLoading}
              isAppReady={isAppReady}
              actionError={fetcher.data?.error}
              actionSuccess={fetcher.data?.success}
            />
          </Layout.Section>

          {revalidated && (
            <Layout.Section>
              <Card>
                <Box background="bg-surface-success" padding="400" borderRadius="200">
                  <Text as="p" variant="bodySm" tone="success">
                    ✓ ScriptTag automatically revalidated on page load
                  </Text>
                </Box>
              </Card>
            </Layout.Section>
          )}

          {allScriptTags.length > 0 && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    All ScriptTags in Shopify ({allScriptTags.length})
                  </Text>
                  <BlockStack gap="300">
                    {allScriptTags.map((tag, index) => (
                      <Box key={index} background="bg-surface-secondary" padding="300" borderRadius="200">
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm">
                            <strong>ID:</strong> {tag.id.replace('gid://shopify/ScriptTag/', '')}
                          </Text>
                          <Text as="p" variant="bodySm">
                            <strong>Source:</strong> {tag.src}
                          </Text>
                          <Text as="p" variant="bodySm">
                            <strong>Scope:</strong> {tag.displayScope}
                          </Text>
                          <Text as="p" variant="bodySm">
                            <strong>Created:</strong> {new Date(tag.createdAt).toLocaleString()}
                          </Text>
                          {tag.src.includes('/stickybar.js') && (
                            <Badge tone="info">Smart Sticky Script</Badge>
                          )}
                        </BlockStack>
                      </Box>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Enhanced Features
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    ✓ Product page detection only
                  </Text>
                  <Text as="p" variant="bodyMd">
                    ✓ Form cloning with variant selection
                  </Text>
                  <Text as="p" variant="bodyMd">
                    ✓ Mobile-responsive design
                  </Text>
                  <Text as="p" variant="bodyMd">
                    ✓ Smooth animations
                  </Text>
                  <Text as="p" variant="bodyMd">
                    ✓ Dynamic content detection
                  </Text>
                  <Text as="p" variant="bodyMd">
                    ✓ Automatic cleanup on unload
                  </Text>
                  <Text as="p" variant="bodyMd">
                    ✓ Auto-revalidation on page load
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
