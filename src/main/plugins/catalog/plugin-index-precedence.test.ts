import { expect, it } from 'vitest'
import { parsePluginMarketplaceIndex, selectPluginIndexFilename } from './plugin-marketplace-fetch'
it.each([
  [[], undefined],
  [['orca-marketplace.json'], 'orca-marketplace.json'],
  [['orca-marketplace.json', 'coding-marketplace.json'], 'coding-marketplace.json'],
  [['orca-marketplace.json', 'coding-marketplace.json', 'orca-catalog.json'], 'orca-catalog.json'],
  [
    [
      'orca-marketplace.json',
      'orca-catalog.json',
      'coding-marketplace.json',
      'coding-catalog.json'
    ],
    'coding-catalog.json'
  ]
] as const)('selects the first supported index from %s', (names, expected) => {
  expect(selectPluginIndexFilename(new Map(names.map((name) => [name, true] as const)))).toBe(
    expected
  )
})
it.each(['coding-catalog.json', 'orca-catalog.json'])(
  'parses catalog version checks for %s',
  (filename) => {
    expect(() =>
      parsePluginMarketplaceIndex(filename, Buffer.from('{"catalogVersion":999}'))
    ).toThrow()
  }
)
