import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Badge,
  Link,
  Banner,
  List,
} from "@shopify/polaris";
import { TitleBar, useAppBridge , NavMenu } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getExistingScriptTag } from "../services/scriptTag.server";
import prisma from "../db.server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  position: "bottom",
  offset: 100,
};

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    
    // Get first theme as default
    const defaultThemeId = "main";
    
    // Get settings for the default theme
    const settings = await prisma.stickySettings.findUnique({
      where: {
        shop_themeId: {
          shop: session.shop,
          themeId: defaultThemeId,
        },
      },
    });

    // Get ScriptTag status
    const scriptTag = await getExistingScriptTag(session.shop);

    return json({
      shop: session.shop,
      settings: settings || {
        ...DEFAULT_SETTINGS,
        shop: session.shop,
        themeId: defaultThemeId,
      },
      scriptTag,
      scriptTagInstalled: !!scriptTag,
      apiKey: process.env.SHOPIFY_API_KEY || "",
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    return json({
      shop: null,
      settings: DEFAULT_SETTINGS,
      scriptTag: null,
      scriptTagInstalled: false,
      error: error.message,
      apiKey: process.env.SHOPIFY_API_KEY || "",
    });
  }
};

export default function Dashboard() {
  const { shop, settings, scriptTagInstalled, error, apiKey } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [isHydrated, setIsHydrated] = useState(false);

  // Track hydration to prevent hydration mismatches
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Show success message from settings
  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings updated successfully!");
    }
  }, [fetcher.data, shopify]);

  // Prevent hydration mismatch
  if (!isHydrated) {
    return (
      <AppProvider isEmbeddedApp apiKey={apiKey}>
        <NavMenu>
          <Link to="/" rel="home">
            Dashboard
          </Link>
          <Link to="/app/settings">Settings</Link>
          <Link to="/app/scripttag">Script Management</Link>
        </NavMenu>
        <Page>
          <TitleBar title="Smart Sticky Dashboard" />
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
        </Page>
      </AppProvider>
    );
  }

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/" rel="home">
          Dashboard
        </Link>
        <Link to="/app/settings">Settings</Link>
        <Link to="/app/scripttag">Script Management</Link>
      </NavMenu>
      <Page>
        <TitleBar title="Smart Sticky Dashboard" />
        
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Welcome Banner */}
              <Banner
                title="Welcome to Smart Sticky"
                tone="info"
              >
                <Text as="p">
                  Add a sticky "Add to Cart" bar to your product pages to improve mobile conversion rates.
                </Text>
              </Banner>

              {error && (
                <Banner title="Error" tone="critical">
                  <Text as="p">{error}</Text>
                </Banner>
              )}

              {/* Status Overview */}
              <Card>
                <BlockStack gap="400">
                  <Box paddingBlockEnd="200">
                    <Text as="h2" variant="headingMd">
                      Current Status
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Overview of your sticky bar configuration
                    </Text>
                  </Box>

                  <BlockStack gap="300">
                    <InlineStack gap="400" align="space-between">
                      <Text as="p" variant="bodyMd">
                        <strong>Shop:</strong> {shop || "Unknown"}
                      </Text>
                      <Badge tone={scriptTagInstalled ? "success" : "critical"}>
                        {scriptTagInstalled ? "Script Installed" : "Script Not Installed"}
                      </Badge>
                    </InlineStack>

                    <InlineStack gap="400" align="space-between">
                      <Text as="p" variant="bodyMd">
                        <strong>Sticky Bar:</strong> {settings.enabled ? "Enabled" : "Disabled"}
                      </Text>
                      <Badge tone={settings.enabled ? "success" : "attention"}>
                        {settings.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </InlineStack>

                    <InlineStack gap="400" align="space-between">
                      <Text as="p" variant="bodyMd">
                        <strong>Position:</strong> {settings.position === "bottom" ? "Bottom of screen" : "Top of screen"}
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Offset: {settings.offset}px
                      </Text>
                    </InlineStack>
                  </BlockStack>

                  <InlineStack gap="300">
                    <Button
                      variant="primary"
                      url="/app/settings"
                    >
                      Configure Settings
                    </Button>
                    {!scriptTagInstalled && (
                      <Button
                        url="/app/scripttag"
                      >
                        Install Script
                      </Button>
                    )}
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* Quick Actions */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Quick Actions
                  </Text>
                  
                  <Box
                    background="bg-surface-secondary"
                    padding="400"
                    borderRadius="200"
                  >
                    <InlineStack gap="300" wrap>
                      <Button
                        url="/app/settings"
                        size="medium"
                      >
                        Settings
                      </Button>
                      <Button
                        url="/app/scripttag"
                        size="medium"
                      >
                        Script Management
                      </Button>
                    </InlineStack>
                  </Box>
                </BlockStack>
              </Card>

              {/* Setup Guide */}
              {!scriptTagInstalled && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Setup Guide
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Follow these steps to get your sticky bar working:
                    </Text>
                    <List type="number">
                      <List.Item>
                        <Link url="/app/scripttag">
                          Install the ScriptTag
                        </Link> to inject the sticky bar script
                      </List.Item>
                      <List.Item>
                        <Link url="/app/settings">
                          Configure your settings
                        </Link> (position, offset, etc.)
                      </List.Item>
                      <List.Item>
                        Visit a product page on your store to test the sticky bar
                      </List.Item>
                    </List>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              {/* Feature Overview */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Features
                  </Text>
                  <List>
                    <List.Item>
                      Sticky add-to-cart bar on product pages
                    </List.Item>
                    <List.Item>
                      Automatic cart form detection
                    </List.Item>
                    <List.Item>
                      Responsive mobile design
                    </List.Item>
                    <List.Item>
                      Variant and quantity support
                    </List.Item>
                    <List.Item>
                      Theme-agnostic compatibility
                    </List.Item>
                    <List.Item>
                      Easy installation and setup
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>

              {/* Performance Impact */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Performance
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="space-between">
                      <Text as="span" variant="bodyMd">Script Size:</Text>
                      <Text as="span" variant="bodyMd" tone="subdued">
                        ~15KB
                      </Text>
                    </InlineStack>
                    <InlineStack gap="200" align="space-between">
                      <Text as="span" variant="bodyMd">Load Time:</Text>
                      <Text as="span" variant="bodyMd" tone="subdued">
                        &lt;50ms
                      </Text>
                    </InlineStack>
                    <InlineStack gap="200" align="space-between">
                      <Text as="span" variant="bodyMd">Page Impact:</Text>
                      <Text as="span" variant="bodyMd" tone="success">
                        Minimal
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Support */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Support
                  </Text>
                  <Text as="p" variant="bodyMd">
                    The sticky bar works on product pages only (/products/*) and automatically detects your theme's cart forms.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    If you experience issues, try using the "Force Reinstall" option in Script Management.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}