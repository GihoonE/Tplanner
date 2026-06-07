/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Clickjacking: prevents the page from being embedded in any iframe
  { key: "X-Frame-Options", value: "DENY" },
  // MIME sniffing: forces the browser to respect the declared Content-Type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer leakage: sends only origin (no path) to cross-origin targets
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // XSS / injection: restricts where scripts, styles, and connections may load from
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' for inline hydration scripts
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind generates inline styles
      "style-src 'self' 'unsafe-inline'",
      // User avatars come from Google/Kakao CDNs
      "img-src 'self' data: https:",
      "font-src 'self'",
      // OAuth redirects and Vercel analytics
      "connect-src 'self' https://accounts.google.com https://kauth.kakao.com https://va.vercel-scripts.com",
      // Prevent the app itself from being framed (CSP complement to X-Frame-Options)
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// HSTS is only meaningful over HTTPS — do not send in local dev
const productionHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers:
          process.env.NODE_ENV === "production"
            ? [...securityHeaders, ...productionHeaders]
            : securityHeaders,
      },
    ];
  },
};

export default nextConfig;
