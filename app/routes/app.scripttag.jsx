import { useLoaderData, useFetcher } from "@remix-run/react";
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
import { TitleBar } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getExistingScriptTag } from "../services/scriptTag.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  try {
    const scriptTag = await getExistingScriptTag(session.shop);
    return json({
      shop: session.shop,
      scriptTag,
      installed: !!scriptTag,
    });
  } catch (error) {
    console.error("Error loading ScriptTag status:", error);
    return json({
      shop: session.shop,
      scriptTag: null,
      installed: false,
      error: error.message,
    });
  }
};

export default function ScriptTagManagement() {
  const { shop, scriptTag, installed, error } = useLoaderData();
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";

  const handleInstall = () => {
    fetcher.submit({ action: "install" }, { method: "POST", action: "/api/scripttag" });
  };

  const handleUninstall = () => {
    fetcher.submit({ action: "uninstall" }, { method: "POST", action: "/api/scripttag" });
  };

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
                  Shop: <strong>{shop}</strong>
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
                      onClick={handleInstall}
                    >
                      Install ScriptTag
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      tone="critical"
                      loading={isLoading}
                      onClick={handleUninstall}
                    >
                      Remove ScriptTag
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
