import { ImageResponse } from "next/og";

export const alt = "Eudora — AI-powered Education OS";
export const size = { width: 1200, height: 630 };
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
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(255,255,255,0.08), transparent 45%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "#ffffff",
            }}
          />
          <span style={{ fontSize: 40, fontWeight: 700, color: "#ffffff" }}>Eudora</span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 60,
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#ffffff",
            maxWidth: 900,
          }}
        >
          Learn intelligently. Teach effortlessly.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 26,
            color: "rgba(255,255,255,0.6)",
            maxWidth: 800,
          }}
        >
          The AI-powered education operating system for schools.
        </div>
      </div>
    ),
    { ...size },
  );
}
