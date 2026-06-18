import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #17120b 0%, #241b12 55%, #3a1f24 100%)",
          color: "#f8ead2",
          padding: 72,
          fontFamily: "Georgia",
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 2, color: "#d9a85c" }}>ATHENA</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ maxWidth: 860, fontSize: 82, lineHeight: 0.96 }}>
            Your AI reading companion
          </div>
          <div style={{ marginTop: 34, maxWidth: 780, fontSize: 32, lineHeight: 1.35, color: "#d8c5aa" }}>
            Track books, save quotes, and ask an AI librarian for recommendations that pay attention.
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 24, color: "#d9a85c" }}>
          <span>Library</span>
          <span>Quotes</span>
          <span>Librarian</span>
        </div>
      </div>
    ),
    size,
  );
}
