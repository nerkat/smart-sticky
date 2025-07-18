import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Banner,
  Box,
  InlineStack,
  Divider,
  List,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getExistingScriptTag } from "../services/scriptTag.server";
import prisma from "../db.server";

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  position: "bottom",
  offset: 100,
};

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    
    // Get first theme as default (you might want to get the current theme)
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
    });
  } catch (error) {
    console.error("Error loading settings:", error);
    return json({
      shop: null,
      settings: DEFAULT_SETTINGS,
      scriptTag: null,
      scriptTagInstalled: false,
      error: error.message,
    });
  }
};

export default function Settings() {
  const { shop, settings, scriptTagInstalled, error } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [formData, setFormData] = useState({
    enabled: settings.enabled,
    position: settings.position,
    offset: settings.offset.toString(),
  });
  
  const isLoading = fetcher.state !== "idle";
  const hasChanges = formData.enabled !== settings.enabled || 
                    formData.position !== settings.position || 
                    parseInt(formData.offset) !== settings.offset;

  // Handle form submission
  const handleSave = () => {
    fetcher.submit(
      {
        themeId: settings.themeId,
        enabled: formData.enabled,
        position: formData.position,
        offset: parseInt(formData.offset),
      },
      { method: "POST", action: "/api/settings" }
    );
  };

  // Show success message
  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved successfully!");
    }
  }, [fetcher.data, shopify]);

  // Position options
  const positionOptions = [
    { label: "Bottom of screen", value: "bottom" },
    { label: "Top of screen", value: "top" },
  ];

  return (
    <Page>
      <TitleBar title="Smart Sticky Settings" />
      
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Status Banner */}
            {!scriptTagInstalled && (
              <Banner
                title="ScriptTag Not Installed"
                tone="warning"
                action={{
                  content: "Install ScriptTag",
                  url: "/app/scripttag",
                }}
              >
                <Text as="p">
                  The sticky bar script is not installed. Visit the ScriptTag Management page to install it.
                </Text>
              </Banner>
            )}

            {error && (
              <Banner title="Error" tone="critical">
                <Text as="p">{error}</Text>
              </Banner>
            )}

            {fetcher.data?.error && (
              <Banner title="Save Error" tone="critical">
                <Text as="p">{fetcher.data.error}</Text>
              </Banner>
            )}

            {/* Main Settings Card */}
            <Card>
              <BlockStack gap="400">
                <Box paddingBlockEnd="200">
                  <Text as="h2" variant="headingMd">
                    Sticky Bar Configuration
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Configure how the sticky add-to-cart bar appears on your product pages.
                  </Text>
                </Box>

                <FormLayout>
                  <FormLayout.Group>
                    <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                      <InlineStack gap="300" align="space-between">
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingSm">
                            Enable Sticky Bar
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Turn the sticky bar on or off globally
                          </Text>
                        </BlockStack>
                        <Checkbox
                          checked={formData.enabled}
                          onChange={(checked) => setFormData({...formData, enabled: checked})}
                          label=""
                        />
                      </InlineStack>
                    </Box>
                  </FormLayout.Group>

                  <Divider />

                  <FormLayout.Group>
                    <Select
                      label="Position"
                      options={positionOptions}
                      value={formData.position}
                      onChange={(value) => setFormData({...formData, position: value})}
                      helpText="Choose where the sticky bar appears on the screen"
                    />
                    
                    <TextField
                      label="Scroll Offset"
                      type="number"
                      value={formData.offset}
                      onChange={(value) => setFormData({...formData, offset: value})}
                      suffix="pixels"
                      helpText="How many pixels to scroll before showing the sticky bar"
                      min="0"
                      max="500"
                    />
                  </FormLayout.Group>

                  <InlineStack gap="300">
                    <Button
                      variant="primary"
                      loading={isLoading}
                      disabled={!hasChanges}
                      onClick={handleSave}
                    >
                      Save Settings
                    </Button>
                    <Button
                      disabled={!hasChanges}
                      onClick={() => setFormData({
                        enabled: settings.enabled,
                        position: settings.position,
                        offset: settings.offset.toString(),
                      })}
                    >
                      Reset
                    </Button>
                  </InlineStack>
                </FormLayout>
              </BlockStack>
            </Card>

            {/* Preview Card */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Preview
                </Text>
                <Box 
                  background="bg-surface-secondary" 
                  padding="400" 
                  borderRadius="200"
                  borderWidth="025"
                  borderColor="border"
                >
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      <strong>Status:</strong> {formData.enabled ? "Enabled" : "Disabled"}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>Position:</strong> {formData.position === "bottom" ? "Bottom of screen" : "Top of screen"}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>Trigger:</strong> After scrolling {formData.offset} pixels
                    </Text>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            {/* Status Card */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Status
                </Text>
                <BlockStack gap="200">
                  <InlineStack gap="200" align="space-between">
                    <Text as="span" variant="bodyMd">Shop:</Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {shop || "Unknown"}
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" align="space-between">
                    <Text as="span" variant="bodyMd">ScriptTag:</Text>
                    <Text as="span" variant="bodyMd" tone={scriptTagInstalled ? "success" : "critical"}>
                      {scriptTagInstalled ? "Installed" : "Not Installed"}
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" align="space-between">
                    <Text as="span" variant="bodyMd">Theme:</Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {settings.themeId}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Help Card */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  How It Works
                </Text>
                <List>
                  <List.Item>
                    Sticky bar appears on product pages only
                  </List.Item>
                  <List.Item>
                    Shows when the original add-to-cart button scrolls out of view
                  </List.Item>
                  <List.Item>
                    Automatically detects cart forms and product variants
                  </List.Item>
                  <List.Item>
                    Fully responsive and mobile-friendly
                  </List.Item>
                  <List.Item>
                    Works with most Shopify themes
                  </List.Item>
                </List>
              </BlockStack>
            </Card>

            {/* Advanced Card */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Advanced
                </Text>
                <BlockStack gap="200">
                  <Button
                    url="/app/scripttag"
                    size="slim"
                  >
                    Manage ScriptTag
                  </Button>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Install, uninstall, or troubleshoot the sticky bar script
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}