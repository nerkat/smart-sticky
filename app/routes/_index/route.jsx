import { useEffect, useState } from "react";

export default function Index() {
  const [themeId, setThemeId] = useState(null);
  const [position, setPosition] = useState("bottom");
  const [offset, setOffset] = useState(150);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch theme ID first
  useEffect(() => {
    fetch("/api/themes")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setThemeId(data.themeId);
      })
      .catch((error) => {
        console.error("Error loading theme ID:", error);
        setThemeId("fallback-theme-id");
      });
  }, []);

  // Load settings once we have theme ID
  useEffect(() => {
    if (!themeId) return;
    
    fetch(`/api/settings?themeId=${themeId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data?.settings) {
          setPosition(data.settings.position);
          setOffset(data.settings.offset);
          setEnabled(data.settings.enabled);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading settings:", error);
        setLoading(false);
      });
  }, [themeId]);

  const save = async () => {
    if (!themeId) {
      alert("Theme ID not available. Please refresh the page.");
      return;
    }
    
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          themeId,
          position,
          offset,
          enabled,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings. Please try again.");
    }
  };

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) return null; // or spinner

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Sticky Cart Bar Settings</h1>
      
      {!themeId ? (
        <p>Loading theme information...</p>
      ) : (
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "1rem" }}>
          Theme ID: {themeId}
        </p>
      )}

      {loading ? (
        <p>Loading settings...</p>
      ) : (
        <>
          <label>
            Enable:
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
          </label>

          <br />

          <label>
            Position:
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
            </select>
          </label>

          <br />

          <label>
            Scroll Offset (px):
            <input
              type="number"
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
            />
          </label>

          <br />
          <br />

          <button onClick={save} style={{ padding: "10px 20px", backgroundColor: "#007cba", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Save Settings
          </button>

        </>
      )}
    </div>
  );
}
