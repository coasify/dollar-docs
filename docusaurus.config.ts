import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// Keep the current deployment's canonical domain; the xyz project can use its existing variant flag.
const siteUrl = process.env.SITE_URL ?? (process.env.SITE_VARIANT === 'xyz'
  ? 'https://docs.dollarstore.xyz'
  : 'https://docs.dollarstore.world');

const config: Config = {
  title: 'DollarStore',
  tagline: '1:1 stablecoin swaps',
  favicon: 'img/favicon.png',

  future: {
    v4: true,
  },

  url: siteUrl,
  baseUrl: '/',

  organizationName: 'coasify',
  projectName: 'dollar-docs',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {
    hooks: {onBrokenMarkdownLinks: 'throw'},
  },

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
          editUrl: 'https://github.com/coasify/dollar-docs/tree/main/',
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
        'Upcoming 0.11.0 interface — <a href="/resources/addresses">verify deployment version</a>. Protocol use is subject to the <a href="/resources/protocol-terms">Protocol Terms</a> and is not available to U.S. Persons.',
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
          href: 'https://www.dollarstore.xyz',
          label: 'Website',
          position: 'right',
        },
        {
          href: 'https://app.dollarstore.xyz',
          label: 'App',
          position: 'right',
        },
        {
          href: 'https://github.com/coasify/dollar',
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
              label: 'dollarstore.xyz',
              href: 'https://www.dollarstore.xyz',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/coasify/dollar',
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
      copyright: `Experimental software. Verify the deployment version before integrating. Network fees and issuer restrictions apply.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['solidity'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
