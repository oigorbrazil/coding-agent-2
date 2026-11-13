import { defineConfig } from 'i18next-cli'

const output =
  process.env.ORCA_I18N_EXTRACTION_OUTPUT ?? 'tmp/localization-extraction/{{language}}.json'

export default defineConfig({
  locales: ['en'],
  extract: {
    input: ['src/**/*.{js,jsx,ts,tsx,mts,cts}'],
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
      '**/__snapshots__/**',
      '**/assets/**',
      // The playbooks editor ships its own en/pt message catalogs (lib/coding-opus-playbooks/messages.*.json).
      'src/renderer/src/components/settings/coding-opus/playbooks/**',
      'src/renderer/src/lib/coding-opus-playbooks/**'
    ],
    output,
    defaultNS: false,
    functions: ['t', '*.t', 'translate', 'translateMain', 'translateSearchKeyword'],
    useTranslationNames: ['useTranslation'],
    sort: true,
    removeUnusedKeys: true
  }
})
