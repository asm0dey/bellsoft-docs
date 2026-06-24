// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import starlightLinksValidator from 'starlight-links-validator';
import starlightSidebarTopics from 'starlight-sidebar-topics';

export default defineConfig({
  markdown: {
    // starlight-links-validator requires the unified processor (not the Astro 7 Sätteri default)
    processor: unified(),
  },
  integrations: [
    starlight({
      title: 'BellSoft Docs',
      logo: {
        light: './src/assets/bellsoft-logo.svg',
        dark: './src/assets/bellsoft-logo-white.svg',
        replacesTitle: false,
        alt: 'BellSoft',
      },
      social: [
        { icon: 'external', label: 'bell-sw.com', href: 'https://bell-sw.com/' },
      ],
      customCss: ['./src/styles/custom.css'],
      components: {
        Sidebar: './src/components/VersionSwitcher.astro',
      },
      plugins: [
        starlightLinksValidator(),
        starlightSidebarTopics([
          {
            label: 'Liberica JDK',
            link: '/liberica-jdk/25.0.3b11/install-guide/',
            icon: 'seti:java',
            items: [
              {
                label: '25.0.3+11 (LTS)',
                items: [
                  'liberica-jdk/25.0.3b11/release-notes',
                  'liberica-jdk/25.0.3b11/install-guide',
                  { label: 'How To', items: [
                    'liberica-jdk/25.0.3b11/how-to/ide',
                    'liberica-jdk/25.0.3b11/how-to/jvm-memory',
                    'liberica-jdk/25.0.3b11/how-to/crac',
                  ]},
                  { label: 'Debugging and Optimization', items: [
                    'liberica-jdk/25.0.3b11/debugging/jfr-mission-control',
                    'liberica-jdk/25.0.3b11/debugging/jcmd',
                  ]},
                ],
              },
              {
                label: '21.0.6+10 (LTS)',
                items: [
                  'liberica-jdk/21.0.6b10/release-notes',
                  'liberica-jdk/21.0.6b10/install-guide',
                  { label: 'How To', items: [
                    'liberica-jdk/21.0.6b10/how-to/ide',
                    'liberica-jdk/21.0.6b10/how-to/jvm-memory',
                    'liberica-jdk/21.0.6b10/how-to/crac',
                  ]},
                  { label: 'Debugging and Optimization', items: [
                    'liberica-jdk/21.0.6b10/debugging/jfr-mission-control',
                    'liberica-jdk/21.0.6b10/debugging/jcmd',
                  ]},
                ],
              },
              // Visible external links — hosted on the official site.
              {
                label: 'Security Advisory',
                link: 'https://docs.bell-sw.com/liberica-jdk/latest/general/security-advisory/',
                attrs: { target: '_blank', rel: 'noopener' },
                badge: { text: 'official', variant: 'tip' },
              },
              {
                label: 'Legal',
                items: [
                  {
                    label: 'Liberica JDK EULA',
                    link: 'https://bell-sw.com/liberica_eula/',
                    attrs: { target: '_blank', rel: 'noopener' },
                  },
                  {
                    label: 'EULA (docs)',
                    link: 'https://docs.bell-sw.com/liberica-jdk/latest/legal/eula/',
                    attrs: { target: '_blank', rel: 'noopener' },
                  },
                  {
                    label: 'Third-party licenses (JDK 17)',
                    link: 'https://docs.bell-sw.com/liberica-jdk/latest/legal/license-jdk17/',
                    attrs: { target: '_blank', rel: 'noopener' },
                  },
                ],
              },
            ],
          },
          {
            label: 'Native Image Kit',
            link: '/liberica-nik/25.0.3b11/install-guide/',
            icon: 'rocket',
            items: [
              'liberica-nik',
              {
                label: '25.0.3+11 (LTS)',
                items: [
                  'liberica-nik/25.0.3b11/release-notes',
                  'liberica-nik/25.0.3b11/install-guide',
                  { label: 'How To', items: ['liberica-nik/25.0.3b11/how-to/spring-boot'] },
                ],
              },
              {
                label: '21.0.6+10 (LTS)',
                items: [
                  'liberica-nik/21.0.6b10/release-notes',
                  'liberica-nik/21.0.6b10/install-guide',
                  { label: 'How To', items: ['liberica-nik/21.0.6b10/how-to/spring-boot'] },
                ],
              },
            ],
          },
          {
            label: 'Container Images',
            link: '/containers/',
            icon: 'seti:docker',
            items: ['containers', 'containers/tags', 'containers/usage'],
          },
          {
            label: 'Alpaquita Linux',
            link: '/alpaquita/',
            icon: 'linux',
            items: ['alpaquita', 'alpaquita/get-started'],
          },
        ]),
      ],
    }),
  ],
});
