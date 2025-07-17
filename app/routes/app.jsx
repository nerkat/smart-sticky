import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { useEffect, useState } from "react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const [isHydrated, setIsHydrated] = useState(false);

  // Track hydration to prevent hydration mismatches
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Prevent hydration mismatch by ensuring consistent rendering
  if (!isHydrated) {
    return (
      <AppProvider isEmbeddedApp apiKey={apiKey}>
        <div style={{ padding: "20px", textAlign: "center" }}>
          Loading...
        </div>
      </AppProvider>
    );
  }

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/additional">Additional page</Link>
        <Link to="/app">Settings</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
