import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'DollarStore',
  tagline: '1:1 stablecoin swaps',
  favicon: 'img/favicon.png',

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
    announcementBar: {
      id: 'protocol-access-notice',
      content:
        'Protocol use is subject to the <a href="/resources/protocol-terms">Protocol Terms</a> and is not available to U.S. Persons.',
      backgroundColor: '#f8f1e0',
      textColor: '#7a5a0e',
      isCloseable: false,
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true, // Match the reference site's light palette.
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Dollar Store',
      logo: {
        alt: '',
        src: 'img/dollarstore-mark.png',
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
          label: 'Website',
          position: 'right',
        },
        {
          href: 'https://app.dollarstore.world',
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
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['solidity'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
