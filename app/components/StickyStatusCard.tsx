import {
  Card,
  BlockStack,
  Text,
  InlineStack,
  Badge,
  Box,
  Button,
  Spinner,
} from "@shopify/polaris";

interface ScriptTag {
  id: string;
  scriptTagId: string;
  src: string;
  createdAt: string;
  lastInstallAt?: string;
}

interface StickyStatusCardProps {
  shop?: string;
  scriptTag?: ScriptTag;
  installed: boolean;
  error?: string;
  apiError?: string;
  isLoading: boolean;
  isAppReady: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onForceReinstall: () => void;
  onRevalidate: () => void;
  success?: string;
}

export function StickyStatusCard({
  shop,
  scriptTag,
  installed,
  error,
  apiError,
  isLoading,
  isAppReady,
  onInstall,
  onUninstall,
  onForceReinstall,
  onRevalidate,
  success,
}: StickyStatusCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "Invalid date";
    }
  };

  return (
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
          {isLoading && (
            <InlineStack gap="100" align="center">
              <Spinner size="small" />
              <Text as="span" variant="bodySm" tone="subdued">
                Processing...
              </Text>
            </InlineStack>
          )}
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
                <strong>Created:</strong> {formatDate(scriptTag.createdAt)}
              </Text>
              {scriptTag.lastInstallAt && (
                <Text as="p" variant="bodySm">
                  <strong>Last Install:</strong> {formatDate(scriptTag.lastInstallAt)}
                </Text>
              )}
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

        {apiError && (
          <Box background="bg-surface-critical" padding="400" borderRadius="200">
            <Text as="p" variant="bodySm" tone="critical">
              API Error: {apiError}
            </Text>
            {apiError.includes("Session expired") && (
              <Text as="p" variant="bodySm" tone="critical">
                Session expired. The page will automatically refresh in 3 seconds to restore your session.
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

        {success && (
          <Box background="bg-surface-success" padding="400" borderRadius="200">
            <Text as="p" variant="bodySm" tone="success">
              {success}
            </Text>
          </Box>
        )}

        <InlineStack gap="300" wrap={false}>
          {!installed ? (
            <Button
              variant="primary"
              loading={isLoading}
              disabled={!isAppReady}
              onClick={onInstall}
            >
              {!isAppReady ? "Loading..." : "Install ScriptTag"}
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                tone="critical"
                loading={isLoading}
                disabled={!isAppReady}
                onClick={onUninstall}
              >
                {!isAppReady ? "Loading..." : "Remove ScriptTag"}
              </Button>
              <Button
                loading={isLoading}
                disabled={!isAppReady}
                onClick={onForceReinstall}
              >
                Force Reinstall
              </Button>
            </>
          )}
          <Button
            loading={isLoading}
            disabled={!isAppReady}
            onClick={onRevalidate}
          >
            Revalidate
          </Button>
        </InlineStack>

        <Text as="p" variant="bodyMd">
          The ScriptTag automatically injects the sticky bar functionality into your storefront.
          When installed, it will load the sticky add-to-cart bar script on product pages only.
        </Text>
      </BlockStack>
    </Card>
  );
}