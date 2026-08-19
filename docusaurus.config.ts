import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'DollarStore',
  tagline: '1:1 stablecoin swaps',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://docs.dollarstore.world',
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
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true, // Dark only
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'dollarstore',
      logo: {
        alt: 'DollarStore Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://dollarstore.world',
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
              label: 'dollarstore.world',
              href: 'https://dollarstore.world',
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
      theme: prismThemes.dracula,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['solidity'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
