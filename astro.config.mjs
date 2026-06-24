// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics';

export default defineConfig({
  integrations: [
    starlight({
      title: 'BellSoft Docs',
      customCss: ['./src/styles/custom.css'],
      plugins: [
        starlightSidebarTopics([
          {
            label: 'Liberica JDK',
            link: '/liberica-jdk/25/install-guide/',
            icon: 'seti:java',
            items: [
              {
                label: 'Version 25 (LTS)',
                items: [
                  'liberica-jdk/25/release-notes',
                  'liberica-jdk/25/install-guide',
                ],
              },
              {
                label: 'Version 21 (LTS)',
                items: [
                  'liberica-jdk/21/release-notes',
                  'liberica-jdk/21/install-guide',
                ],
              },
              {
                label: 'How To',
                items: [
                  'liberica-jdk/how-to/ide',
                  'liberica-jdk/how-to/jvm-memory',
                  'liberica-jdk/how-to/crac',
                ],
              },
              {
                label: 'Debugging and Optimization',
                items: [
                  'liberica-jdk/debugging/jfr-mission-control',
                  'liberica-jdk/debugging/jcmd',
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
            link: '/liberica-nik/',
            icon: 'rocket',
            items: [
              'liberica-nik',
              'liberica-nik/install-guide',
              'liberica-nik/release-notes',
              'liberica-nik/how-to-spring-boot',
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
