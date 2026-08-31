import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'idea',
    'quickstart',
    {
      type: 'category',
      label: 'Concepts',
      collapsed: false,
      items: [
        'concepts/supply',
        'concepts/spokes',
        'concepts/queue',
        'concepts/time-tradeoff',
        'concepts/resolution',
      ],
    },
    {
      type: 'category',
      label: 'Capabilities',
      collapsed: false,
      items: [
        'capabilities/overview',
        'capabilities/functions',
        'capabilities/events',
        'capabilities/errors',
      ],
    },
    {
      type: 'category',
      label: 'Resources',
      collapsed: false,
      items: [
        'resources/addresses',
        'resources/security',
        'resources/faq',
        'resources/terms',
        'resources/protocol-terms',
      ],
    },
  ],
};

export default sidebars;
