/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(equipo|puerta)", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }];
  },
};
