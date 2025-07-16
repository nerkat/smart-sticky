import { useEffect, useState } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../../shopify.server";

export async function loader({ request }) {
  try {
    // Get theme ID first
    let themeId = "fallback-theme-id";
    let themes = [];
    
    if (process.env.NODE_ENV === "development") {
      themeId = "dev-theme-123";
      themes = [{ id: "dev-theme-123", name: "Development Theme", role: "MAIN" }];
    } else {
      try {
        const { admin } = await authenticate.admin(request);
        const response = await admin.graphql(`
          query {
            themes(first: 250) {
              edges {
                node {
                  id
                  name
                  role
                }
              }
            }
          }
        `);
        const { data } = await response.json();
        themes = data.themes.edges.map(edge => edge.node);
        const mainTheme = themes.find(theme => theme.role === 'MAIN') || themes[0];
        themeId = mainTheme?.id?.replace('gid://shopify/Theme/', '') || 'unknown';
      } catch (error) {
        console.error('Error fetching themes:', error);
      }
    }

    // Get settings for this theme
    let settings = null;
    try {
      const isDev = process.env.NODE_ENV === "development";
      const session = isDev ? { shop: "dev-shop.myshopify.com" } : (await authenticate.admin(request)).session;
      
      const prisma = (await import("../../db.server")).default;
      settings = await prisma.stickySettings.findUnique({
        where: {
          shop_themeId: {
            shop: session.shop,
            themeId,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }

    return json({ 
      themeId, 
      themes,
      settings: settings || {
        enabled: true,
        position: "bottom",
        offset: 150
      }
    });
  } catch (error) {
    console.error('Loader error:', error);
    return json({ 
      themeId: "fallback-theme-id", 
      themes: [],
      settings: {
        enabled: true,
        position: "bottom",
        offset: 150
      }
    });
  }
}

export default function Index() {
  const { themeId, settings: initialSettings } = useLoaderData();
  const fetcher = useFetcher();
  
  const [position, setPosition] = useState(initialSettings.position);
  const [offset, setOffset] = useState(initialSettings.offset);
  const [enabled, setEnabled] = useState(initialSettings.enabled);

  const save = async () => {
    fetcher.submit(
      {
        themeId,
        position,
        offset: offset.toString(),
        enabled: enabled.toString(),
      },
      {
        method: "post",
        action: "/api/settings",
      }
    );
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      alert("Settings saved successfully!");
    } else if (fetcher.data && !fetcher.data.success) {
      alert("Failed to save settings");
    }
  }, [fetcher.data]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Sticky Cart Bar Settings</h1>
      
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "1rem" }}>
        Theme ID: {themeId}
      </p>

      <div>
        <label style={{ display: "block", marginBottom: "1rem" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          Enable Sticky Cart Bar
        </label>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          Position:
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            style={{ marginLeft: "8px", padding: "4px" }}
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
          </select>
        </label>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          Scroll Offset (px):
          <input
            type="number"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
            style={{ marginLeft: "8px", padding: "4px", width: "100px" }}
          />
        </label>

        <button 
          onClick={save} 
          disabled={fetcher.state === "submitting"}
          style={{ 
            padding: "10px 20px", 
            backgroundColor: fetcher.state === "submitting" ? "#ccc" : "#007cba", 
            color: "white", 
            border: "none", 
            borderRadius: "4px", 
            cursor: fetcher.state === "submitting" ? "not-allowed" : "pointer" 
          }}
        >
          {fetcher.state === "submitting" ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
