import { useState } from "react";
import {
  Card,
  Button,
  BlockStack,
  Text,
  InlineStack,
  Badge,
  Box,
  Spinner,
} from "@shopify/polaris";

interface ScriptTag {
  id: string;
  scriptTagId: string;
  src: string;
  createdAt: string;
  updatedAt: string;
  lastInstalled?: string;
  lastValidated?: string;
}

interface StickyStatusCardProps {
  installed: boolean;
  scriptTag?: ScriptTag | null;
  error?: string | null;
  shop?: string | null;
  onInstall: () => void;
  onUninstall: () => void;
  onForceReinstall: () => void;
  isLoading: boolean;
  isAppReady: boolean;
  actionError?: string | null;
  actionSuccess?: boolean;
}

export function StickyStatusCard({
  installed,
  scriptTag,
  error,
  shop,
  onInstall,
  onUninstall,
  onForceReinstall,
  isLoading,
  isAppReady,
  actionError,
  actionSuccess,
}: StickyStatusCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not available";
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack gap="300" align="space-between">
          <Text as="h2" variant="headingMd">
            Sticky Bar ScriptTag Status
          </Text>
          <Badge tone={installed ? "success" : "critical"}>
            {installed ? "Installed" : "Not Installed"}
          </Badge>
        </InlineStack>

        {shop && (
          <Text as="p" variant="bodyMd">
            Shop: <strong>{shop}</strong>
          </Text>
        )}

        {error && (
          <Box background="bg-surface-critical" padding="400" borderRadius="200">
            <Text as="p" variant="bodySm" tone="critical">
              Error: {error}
            </Text>
          </Box>
        )}

        {actionError && (
          <Box background="bg-surface-critical" padding="400" borderRadius="200">
            <Text as="p" variant="bodySm" tone="critical">
              Action Error: {actionError}
            </Text>
          </Box>
        )}

        {actionSuccess && (
          <Box background="bg-surface-success" padding="400" borderRadius="200">
            <Text as="p" variant="bodySm" tone="success">
              Operation completed successfully!
            </Text>
          </Box>
        )}

        {!isAppReady && (
          <Box background="bg-surface-caution" padding="400" borderRadius="200">
            <InlineStack gap="200" align="start">
              <Spinner size="small" />
              <Text as="p" variant="bodySm" tone="caution">
                App is initializing... Please wait before performing actions.
              </Text>
            </InlineStack>
          </Box>
        )}

        {scriptTag && (
          <Box background="bg-surface-secondary" padding="400" borderRadius="200">
            <BlockStack gap="200">
              <InlineStack gap="200" align="space-between">
                <Text as="h3" variant="headingSm">ScriptTag Details</Text>
                <Button
                  variant="plain"
                  size="micro"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? "Hide Details" : "Show Details"}
                </Button>
              </InlineStack>
              
              <Text as="p" variant="bodySm">
                <strong>Last Installed:</strong> {formatDate(scriptTag.lastInstalled)}
              </Text>
              
              {scriptTag.lastValidated && (
                <Text as="p" variant="bodySm">
                  <strong>Last Validated:</strong> {formatDate(scriptTag.lastValidated)}
                </Text>
              )}

              {showDetails && (
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm">
                    <strong>ID:</strong> {scriptTag.scriptTagId || scriptTag.id}
                  </Text>
                  <Text as="p" variant="bodySm">
                    <strong>Source:</strong> {scriptTag.src}
                  </Text>
                  <Text as="p" variant="bodySm">
                    <strong>Created:</strong> {formatDate(scriptTag.createdAt)}
                  </Text>
                  <Text as="p" variant="bodySm">
                    <strong>Updated:</strong> {formatDate(scriptTag.updatedAt)}
                  </Text>
                </BlockStack>
              )}
            </BlockStack>
          </Box>
        )}

        <InlineStack gap="300">
          {!installed ? (
            <Button
              variant="primary"
              loading={isLoading}
              disabled={!isAppReady}
              onClick={onInstall}
            >
              {isLoading ? (
                <InlineStack gap="200" align="center">
                  <Spinner size="small" />
                  <Text>Installing...</Text>
                </InlineStack>
              ) : !isAppReady ? (
                "Loading..."
              ) : (
                "Install ScriptTag"
              )}
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
                {isLoading ? (
                  <InlineStack gap="200" align="center">
                    <Spinner size="small" />
                    <Text>Removing...</Text>
                  </InlineStack>
                ) : !isAppReady ? (
                  "Loading..."
                ) : (
                  "Remove ScriptTag"
                )}
              </Button>
              <Button
                variant="secondary"
                loading={isLoading}
                disabled={!isAppReady}
                onClick={onForceReinstall}
              >
                {isLoading ? (
                  <InlineStack gap="200" align="center">
                    <Spinner size="small" />
                    <Text>Reinstalling...</Text>
                  </InlineStack>
                ) : !isAppReady ? (
                  "Loading..."
                ) : (
                  "Force Reinstall"
                )}
              </Button>
            </>
          )}
        </InlineStack>

        <Text as="p" variant="bodySm" tone="subdued">
          The ScriptTag automatically injects the sticky bar functionality into your storefront.
          When installed, it will load the sticky add-to-cart bar script on product pages only.
        </Text>
      </BlockStack>
    </Card>
  );
}