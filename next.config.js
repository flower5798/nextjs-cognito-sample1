/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages用の設定
  // 画像最適化の設定（Cloudflare Pagesでは外部URLが必要な場合がある）
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig

