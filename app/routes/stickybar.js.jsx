// app/routes/stickybar.js.jsx
import { readFileSync } from 'fs';
import { join } from 'path';

export async function loader({ request }) {
  try {
    // Read the enhanced sticky bar script from web/scripts/stickybar.js
    const scriptPath = join(process.cwd(), 'web', 'scripts', 'stickybar.js');
    const jsContent = readFileSync(scriptPath, 'utf-8');

    // Return JavaScript with proper headers
    return new Response(jsContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*', // Allow cross-origin requests
      },
    });
  } catch (error) {
    console.error('Error reading sticky bar script:', error);
    
    // Fallback to a minimal script if file reading fails
    const fallbackScript = `
      console.error('StickyBar: Failed to load enhanced script, using fallback');
      // Add minimal fallback functionality here if needed
    `;
    
    return new Response(fallbackScript, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=300', // Shorter cache for fallback
      },
    });
  }
}