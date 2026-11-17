import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

const withSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://image.tmdb.org https://lh3.googleusercontent.com; font-src 'self'; connect-src 'self' https://pinflix.pincodeit.com https://media.pincodeit.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firestore.googleapis.com https://pinflix-by-pincode-it.firebaseapp.com; media-src 'self' blob: https://pinflix.pincodeit.com https://media.pincodeit.com; frame-src https://www.youtube-nocookie.com https://pinflix-by-pincode-it.firebaseapp.com https://accounts.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
  },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const config: NextConfig = {
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: withSecurityHeaders }];
  },
};

export default config;
