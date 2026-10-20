import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const xyz = process.env.SITE_VARIANT === "xyz";
const website = xyz ? "https://www.dollarstore.xyz" : "https://dollarstore.world";
const config: Config = {
  title: 'DollarStore',
  tagline: '1:1 stablecoin swaps',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: xyz ? 'https://docs.dollarstore.xyz' : 'https://docs.dollarstore.world',
  baseUrl: '/',

  organizationName: 'wandering-soupsmith',
  projectName: 'dollar-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'content', // Use content folder for docs (docs/ is gitignored for reference)
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Docs at root, no /docs/ prefix
          editUrl: 'https://github.com/wandering-soupsmith/dollar-docs/tree/main/',
        },
        blog: false, // Disable blog
        theme: {
          customCss: xyz ? './src/css/coasify.css' : './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    announcementBar: {
      id: 'protocol-access-notice',
      content:
        'Protocol use is subject to the <a href="/resources/protocol-terms">Protocol Terms</a> and is not available to U.S. Persons.',
      backgroundColor: xyz ? '#f0ede6' : '#111827',
      textColor: xyz ? '#0d1f15' : '#f9fafb',
      isCloseable: false,
    },
    colorMode: {
      defaultMode: xyz ? 'light' : 'dark',
      disableSwitch: true, // Dark only
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'dollarstore',
      logo: {
        alt: 'DollarStore Logo',
        src: xyz ? 'img/coasify-mark.png' : 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: website,
          label: 'Website',
          position: 'right',
        },
        {
          href: xyz ? 'https://app.dollarstore.xyz' : 'https://app.dollarstore.world',
          label: 'App',
          position: 'right',
        },
        {
          href: 'https://github.com/wandering-soupsmith/dollar',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Idea',
              to: '/',
            },
            {
              label: 'Concepts',
              to: '/concepts/supply',
            },
            {
              label: 'Capabilities',
              to: '/capabilities/overview',
            },
          ],
        },
        {
          title: 'Links',
          items: [
            {
              label: xyz ? 'dollarstore.xyz' : 'dollarstore.world',
              href: website,
            },
            {
              label: 'GitHub',
              href: 'https://github.com/wandering-soupsmith/dollar',
            },
          ],
        },
        {
          title: 'Protocol',
          items: [
            {
              label: 'Addresses',
              to: '/resources/addresses',
            },
            {
              label: 'Security',
              to: '/resources/security',
            },
          ],
        },
      ],
      copyright: `Experimental software, not yet deployed. Use at your own risk.`,
    },
    prism: {
      theme: xyz ? prismThemes.github : prismThemes.dracula,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['solidity'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
