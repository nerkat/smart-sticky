// app/routes/api.themes.js
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  try {
    // Development fallback
    if (process.env.NODE_ENV === "development") {
      return json({ 
        themes: [{ id: "dev-theme-123", name: "Development Theme", role: "MAIN" }],
        mainTheme: { id: "dev-theme-123", name: "Development Theme", role: "MAIN" },
        themeId: "dev-theme-123"
      });
    }

    const { admin } = await authenticate.admin(request);
    
    // Get the main/published theme
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
    const themes = data.themes.edges.map(edge => edge.node);
    
    // Find the main/published theme
    const mainTheme = themes.find(theme => theme.role === 'MAIN') || themes[0];
    
    return json({ 
      themes,
      mainTheme,
      themeId: mainTheme?.id?.replace('gid://shopify/Theme/', '') || 'unknown'
    });
  } catch (error) {
    console.error('Error fetching themes:', error);
    return json({ error: 'Failed to fetch themes' }, { status: 500 });
  }
}
