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
import { getExistingScriptTag } from "../services/scriptTag.server";

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

    const { session } = authResult;
    const scriptTag = await getExistingScriptTag(session.shop);
    
    return json({
      shop: session.shop,
      scriptTag,
      installed: !!scriptTag,
    });
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
  const { shop, scriptTag, installed, error } = useLoaderData();
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
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Sticky Bar ScriptTag Status
                </Text>

                <InlineStack gap="200" align="start">
                  <Text as="span" variant="bodyMd">
                    Status:
                  </Text>
                  <Badge tone={installed ? "success" : "critical"}>
                    {installed ? "Installed" : "Not Installed"}
                  </Badge>
                </InlineStack>

                <Text as="p" variant="bodyMd">
                  {shop ? (
                    <>Shop: <strong>{shop}</strong></>
                  ) : (
                    <Text as="span" tone="critical">Shop information not available</Text>
                  )}
                </Text>

                {scriptTag && (
                  <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">ScriptTag Details:</Text>
                      <Text as="p" variant="bodySm">
                        <strong>ID:</strong> {scriptTag.scriptTagId || scriptTag.id}
                      </Text>
                      <Text as="p" variant="bodySm">
                        <strong>Source:</strong> {scriptTag.src}
                      </Text>
                      <Text as="p" variant="bodySm">
                        <strong>Created:</strong> {scriptTag.createdAt ? new Date(scriptTag.createdAt).toLocaleString() : ""}
                      </Text>
                    </BlockStack>
                  </Box>
                )}

                {error && (
                  <Box background="bg-surface-critical" padding="400" borderRadius="200">
                    <Text as="p" variant="bodySm" tone="critical">
                      Error: {error}
                    </Text>
                  </Box>
                )}

                {fetcher.data?.error && (
                  <Box background="bg-surface-critical" padding="400" borderRadius="200">
                    <Text as="p" variant="bodySm" tone="critical">
                      API Error: {fetcher.data.error}
                    </Text>
                    {fetcher.data.error.includes("Session expired") && (
                      <Text as="p" variant="bodySm" tone="critical">
                        Try refreshing the page and make sure you're properly logged in.
                      </Text>
                    )}
                  </Box>
                )}

                {!isAppReady && (
                  <Box background="bg-surface-caution" padding="400" borderRadius="200">
                    <Text as="p" variant="bodySm" tone="caution">
                      App is initializing... Please wait before performing actions.
                    </Text>
                  </Box>
                )}

                {fetcher.data?.success && (
                  <Box background="bg-surface-success" padding="400" borderRadius="200">
                    <Text as="p" variant="bodySm" tone="success">
                      Operation completed successfully!
                    </Text>
                  </Box>
                )}

                <InlineStack gap="300">
                  {!installed ? (
                    <Button
                      variant="primary"
                      loading={isLoading}
                      disabled={!isAppReady || !isHydrated}
                      onClick={handleInstall}
                    >
                      {!isAppReady ? "Loading..." : "Install ScriptTag"}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      tone="critical"
                      loading={isLoading}
                      disabled={!isAppReady || !isHydrated}
                      onClick={handleUninstall}
                    >
                      {!isAppReady ? "Loading..." : "Remove ScriptTag"}
                    </Button>
                  )}
                </InlineStack>

                <Text as="p" variant="bodyMd">
                  The ScriptTag automatically injects the sticky bar functionality into your storefront.
                  When installed, it will load the sticky add-to-cart bar script on all product pages.
                </Text>
              </BlockStack>
            </Card>
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
                    2. The script loads on every storefront page
                  </Text>
                  <Text as="p" variant="bodyMd">
                    3. On product pages, it detects the add-to-cart button
                  </Text>
                  <Text as="p" variant="bodyMd">
                    4. Shows a sticky bar when the original button scrolls out of view
                  </Text>
                  <Text as="p" variant="bodyMd">
                    5. ScriptTag is automatically removed when the app is uninstalled
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
