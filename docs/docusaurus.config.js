// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'openSenseMap Docs',
  tagline: 'Documentation for the openSenseMap API',
  url: 'https://docs.opensensemap.org/',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'sensebox', // Usually your GitHub org/user name.
  projectName: 'openSenseMap-docs', // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          docLayoutComponent: "@theme/DocPage",
          docItemComponent: "@theme/ApiItem" // Derived from docusaurus-theme-openapi-docs
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  plugins: [
    [
    'docusaurus-plugin-openapi-docs',
      {
        id: "apiDocs",
        docsPluginId: "classic",
        config: {
          boxes: {
            specPath: "openapi-specs/boxes.yaml",
            outputDir: "docs/Boxes",
          }, 
          // interpolation: { // Note: key is treated as the <id> and can be used to specify an API doc instance when using CLI commands
          //   specPath: "openapi-specs/interpolation.yaml", // Path to designated spec file
          //   outputDir: "docs/Interpolation", // Output directory for generated .mdx docs
          // },
          // measurements: {
          //   specPath: "openapi-specs/measurements.yaml",
          //   outputDir: "docs/Measurements",
          // },
          // misc: {
          //   specPath: "openapi-specs/misc.yaml",
          //   outputDir: "docs/Misc",
          // },
          // statistics: {
          //   specPath: "openapi-specs/statistics.yaml",
          //   outputDir: "docs/Statistics",
          // },
          // users: {
          //   specPath: "openapi-specs/users.yaml",
          //   outputDir: "docs/Users",
          // },
        }
      },
    ]
  ],

  themes: ["docusaurus-theme-openapi-docs"], // Allows use of @theme/ApiItem and other components

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'openSenseMap API Docs',
        logo: {
          alt: 'openSenseMap Logo',
          src: 'img/openSenseMap.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'API',
          },
          {
            href: 'https://github.com/sensebox/openSenseMap-API',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'API',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'LinkedIn',
                href: 'https://www.linkedin.com/company/reedu-de/',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/SenseBox_De',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/sensebox/openSenseMap-API',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
      },
      colorMode: {
        defaultMode: 'dark',
        // disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      // prism: {
      //   theme: lightCodeTheme,
      //   darkTheme: darkCodeTheme,
      // },
    }),
};

module.exports = config;
