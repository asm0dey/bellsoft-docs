// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import starlightLinksValidator from 'starlight-links-validator';
import starlightSidebarTopics from 'starlight-sidebar-topics';

export default defineConfig({
  site: 'https://asm0dey.github.io',
  base: '/bellsoft-docs',
  markdown: {
    // starlight-links-validator requires the unified processor (not the Astro 7 Sätteri default)
    processor: unified(),
  },
  integrations: [
    starlight({
      title: 'Docs',
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
      routeMiddleware: './src/toc-partials.ts',
      components: {
        Sidebar: './src/components/VersionSwitcher.astro',
        TableOfContents: './src/components/TableOfContents.astro',
      },
      plugins: [
        // Shared partials render under multiple version URLs, so in-content
        // links to sibling pages are relative (`../../install-guide/`) and
        // resolve per-version. Allow them instead of forcing absolute links.
        starlightLinksValidator({ errorOnRelativeLinks: false, errorOnLocalLinks: false }),
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
                  { label: 'Editions & Concepts', items: [
                    'liberica-jdk/25.0.3b11/how-to/choosing-flavor',
                    'liberica-jdk/25.0.3b11/how-to/performance-edition-overview',
                    'liberica-jdk/25.0.3b11/how-to/perf-getting-started',
                  ]},
                  { label: 'How To', items: [
                    'liberica-jdk/25.0.3b11/how-to/use-ide',
                    'liberica-jdk/25.0.3b11/how-to/jvm-memory-configuration',
                    'liberica-jdk/25.0.3b11/how-to/using-crac',
                    'liberica-jdk/25.0.3b11/how-to/updating-time-zone-data',
                  ]},
                  { label: 'Debugging and Optimization', items: [
                    { label: 'JDK Flight Recorder', items: [
                      'liberica-jdk/25.0.3b11/debugging/flight-recorder-mission-control-basics',
                      'liberica-jdk/25.0.3b11/debugging/flight-recorder-code-hotspots',
                      'liberica-jdk/25.0.3b11/debugging/flight-recorder-memory-issues',
                      'liberica-jdk/25.0.3b11/debugging/flight-recorder-help',
                      'liberica-jdk/25.0.3b11/debugging/flight-recorder-stop',
                    ]},
                    'liberica-jdk/25.0.3b11/debugging/perf-monitor-java-performance',
                    'liberica-jdk/25.0.3b11/debugging/use-jcmd',
                  ]},
                  { label: 'Container Images', items: [
                    'liberica-jdk/25.0.3b11/containers',
                    'liberica-jdk/25.0.3b11/containers/tags',
                    'liberica-jdk/25.0.3b11/containers/usage',
                    'liberica-jdk/25.0.3b11/containers/distributions',
                    'liberica-jdk/25.0.3b11/containers/hardened',
                  ]},
                ],
              },
              {
                label: '21.0.6+10 (LTS)',
                items: [
                  'liberica-jdk/21.0.6b10/release-notes',
                  'liberica-jdk/21.0.6b10/install-guide',
                  { label: 'Editions & Concepts', items: [
                    'liberica-jdk/21.0.6b10/how-to/choosing-flavor',
                    'liberica-jdk/21.0.6b10/how-to/performance-edition-overview',
                    'liberica-jdk/21.0.6b10/how-to/perf-getting-started',
                  ]},
                  { label: 'How To', items: [
                    'liberica-jdk/21.0.6b10/how-to/use-ide',
                    'liberica-jdk/21.0.6b10/how-to/jvm-memory-configuration',
                    'liberica-jdk/21.0.6b10/how-to/using-crac',
                    'liberica-jdk/21.0.6b10/how-to/updating-time-zone-data',
                  ]},
                  { label: 'Debugging and Optimization', items: [
                    { label: 'JDK Flight Recorder', items: [
                      'liberica-jdk/21.0.6b10/debugging/flight-recorder-mission-control-basics',
                      'liberica-jdk/21.0.6b10/debugging/flight-recorder-code-hotspots',
                      'liberica-jdk/21.0.6b10/debugging/flight-recorder-memory-issues',
                      'liberica-jdk/21.0.6b10/debugging/flight-recorder-help',
                      'liberica-jdk/21.0.6b10/debugging/flight-recorder-stop',
                    ]},
                    'liberica-jdk/21.0.6b10/debugging/perf-monitor-java-performance',
                    'liberica-jdk/21.0.6b10/debugging/use-jcmd',
                  ]},
                  { label: 'Container Images', items: [
                    'liberica-jdk/21.0.6b10/containers',
                    'liberica-jdk/21.0.6b10/containers/tags',
                    'liberica-jdk/21.0.6b10/containers/usage',
                    'liberica-jdk/21.0.6b10/containers/distributions',
                    'liberica-jdk/21.0.6b10/containers/hardened',
                  ]},
                ],
              },
              // Visible external links — hosted on the official site.
              {
                label: 'Discovery API',
                link: 'https://docs.bell-sw.com/liberica-jdk/latest/api/usage/',
                attrs: { target: '_blank', rel: 'noopener' },
                badge: { text: 'official', variant: 'tip' },
              },
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
                  { label: 'Container Images', items: [
                    'liberica-nik/25.0.3b11/containers',
                    'liberica-nik/25.0.3b11/containers/hardened',
                  ]},
                  { label: 'How To', items: [
                    'liberica-nik/25.0.3b11/how-to/build-native-image-from-springboot',
                    'liberica-nik/25.0.3b11/how-to/containerize-native-images',
                    'liberica-nik/25.0.3b11/how-to/select-gc',
                    'liberica-nik/25.0.3b11/how-to/using-nik-with-desktop-applications',
                  ]},
                ],
              },
              {
                label: '21.0.6+10 (LTS)',
                items: [
                  'liberica-nik/21.0.6b10/release-notes',
                  'liberica-nik/21.0.6b10/install-guide',
                  { label: 'Container Images', items: [
                    'liberica-nik/21.0.6b10/containers',
                    'liberica-nik/21.0.6b10/containers/hardened',
                  ]},
                  { label: 'How To', items: [
                    'liberica-nik/21.0.6b10/how-to/build-native-image-from-springboot',
                    'liberica-nik/21.0.6b10/how-to/containerize-native-images',
                    'liberica-nik/21.0.6b10/how-to/select-gc',
                    'liberica-nik/21.0.6b10/how-to/using-nik-with-desktop-applications',
                  ]},
                ],
              },
              {
                label: 'Discovery API',
                link: 'https://docs.bell-sw.com/liberica-jdk/latest/api/usage/',
                attrs: { target: '_blank', rel: 'noopener' },
                badge: { text: 'official', variant: 'tip' },
              },
            ],
          },
          {
            label: 'Alpaquita Linux',
            link: '/alpaquita/',
            icon: 'linux',
            items: [
              'alpaquita',
              { label: 'Release Information', items: [
                'alpaquita/general/install-guide',
                'alpaquita/general/release-notes',
              ]},
              { label: 'How To', items: [
                'alpaquita/how-to/apk-guide',
                'alpaquita/how-to/images-getting-started-guide',
                'alpaquita/how-to/libc-diff',
                'alpaquita/how-to/malloc',
                'alpaquita/how-to/openrc-for-systemd-adepts',
                'alpaquita/how-to/deploying-java-on-alpaquita-with-ansible',
              ]},
              { label: 'Containers', items: [
                'alpaquita/containers/build-applications-with-buildpacks',
                'alpaquita/containers/java-in-resource-constrained-containers',
                'alpaquita/containers/modify-alpaquita-image',
                'alpaquita/containers/remote-debug',
              ]},
              { label: 'Security', items: [
                'alpaquita/containers/keeping-your-containers-secure',
                'alpaquita/how-to/cosign-guide',
                'alpaquita/how-to/osvscanner-quickstart',
                'alpaquita/how-to/use-own-keys-in-secureboot',
              ]},
              { label: 'Hardened Images', items: [
                'alpaquita/hardened/overview',
                'alpaquita/hardened/catalog',
              ]},
              { label: 'Virtualization', items: [
                'alpaquita/virtualization/virtual-images',
                'alpaquita/virtualization/aws-walkthrough',
                'alpaquita/virtualization/azure-walkthrough',
                'alpaquita/virtualization/gcp-walkthrough',
                'alpaquita/virtualization/firecracker-qemu-vm',
              ]},
            ],
          },
        ]),
      ],
    }),
  ],
});
