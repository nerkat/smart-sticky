import { useEffect, useState } from "react";

export default function Index() {
  const [themeId] = useState("dev-theme-123"); // 🔸 hardcoded for dev
  const [position, setPosition] = useState("bottom");
  const [offset, setOffset] = useState(150);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/settings?themeId=${themeId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setPosition(data.settings.position);
          setOffset(data.settings.offset);
          setEnabled(data.settings.enabled);
        }
        setLoading(false);
      });
  }, [themeId]);

  const save = async () => {
    await fetch("/api/settings", {
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

    alert("Saved!");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Sticky Cart Bar Settings</h1>

      {loading ? (
        <p>Loading…</p>
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

        </>
      )}
    </div>
  );
}
