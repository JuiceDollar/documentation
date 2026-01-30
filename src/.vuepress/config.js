const { description } = require("../../package");

module.exports = {
  title: "JUSD",
  description: description,

  head: [
    ["link", { rel: "icon", href: "/assets/favicon.png" }],
    ["meta", { name: "theme-color", content: "#F57F00" }],
    ["meta", { name: "apple-mobile-web-app-capable", content: "yes" }],
    ["meta", { name: "apple-mobile-web-app-status-bar-style", content: "black" }],
    // Open Graph
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "JuiceDollar Documentation" }],
    ["meta", { property: "og:title", content: "JuiceDollar (JUSD) Documentation" }],
    ["meta", { property: "og:description", content: "JuiceDollar (JUSD) - A decentralized, over-collateralized stablecoin on Citrea. No oracles, no admin keys, fully permissionless." }],
    ["meta", { property: "og:image", content: "https://docs.juicedollar.com/assets/logo.png" }],
    ["meta", { property: "og:url", content: "https://docs.juicedollar.com" }],
    // Twitter Card
    ["meta", { name: "twitter:card", content: "summary" }],
    ["meta", { name: "twitter:title", content: "JuiceDollar (JUSD) Documentation" }],
    ["meta", { name: "twitter:description", content: "JuiceDollar (JUSD) - A decentralized, over-collateralized stablecoin on Citrea. No oracles, no admin keys, fully permissionless." }],
    ["meta", { name: "twitter:image", content: "https://docs.juicedollar.com/assets/logo.png" }],
    // Weglot
    [ "script", { type: "text/javascript", src: "https://cdn.weglot.com/weglot.min.js" }, ],
    [
      "script",
      {},
      `Weglot.initialize({
        api_key: 'wg_3fa7772719c0808c3a058c58e13b59890'
      });
      `,
    ],
  ],

  themeConfig: {
    repo: "JuiceDollar/documentation",
    logo: "/assets/logo.svg",
    editLinks: true,
    editLinkText: "Edit this page on Github",
    docsBranch: "develop",
    docsDir: "src",
    lastUpdated: true,

    nav: [
      {
        text: "JuiceDollar",
        link: "https://juicedollar.com/",
      },
    ],

    sidebar: [
      { title: "Overview", path: "/overview" },

      { title: "Stablecoin Bridges", path: "/swap" },

      { title: "Collateralized Minting", path: "/positions",
        children: [
          "/positions/open",
          "/positions/clone",
          "/positions/adjust",
          "/positions/auctions",
          "/positions/roller",
        ],
      },

      { title: "Savings & Interest", path: "/savings" },

      { title: "Frontend Rewards", path: "/frontend-rewards" },

      { title: "Reserve", path: "/reserve",
        children: [
          "/reserve/pool-shares",
        ],
      },

      { title: "Governance", path: "/governance" },

      { title: "Smart Contracts", path: "/smart-contracts",
        children: [
          "/smart-contracts/functions",
        ],
      },

      { title: "Telegram API Bot", path: "/telegram-api-bot" },
      { title:  "Disclaimer", path: "/disclaimer" },
      { title: "Privacy", path: "/privacy" },
      { title: "Imprint", path: "/imprint" },
      { title: "FAQ", path: "/faq" },

    ],
  },

  plugins: ["@vuepress/plugin-back-to-top", "@vuepress/plugin-medium-zoom"],

  chainWebpack: (config) => {
    config.module
      .rule("vue")
      .use("vue-loader")
      .tap((options) => ({
        ...options,
        compilerOptions: {
          isCustomElement: (tag) => tag.includes("dfx"),
        },
      }));
  },
};
