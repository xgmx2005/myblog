import { describe, expect, test } from 'bun:test'
import { resolveSearchConfig } from '../src/lib/search/config'

describe('search configuration', () => {
  test('uses Pagefind until every Algolia value exists', () => {
    expect(resolveSearchConfig({})).toEqual({ algolia: null, mode: 'pagefind' })
    expect(
      resolveSearchConfig({
        PUBLIC_ALGOLIA_APP_ID: 'APP',
        PUBLIC_ALGOLIA_SEARCH_API_KEY: 'search-only'
      })
    ).toEqual({ algolia: null, mode: 'pagefind' })
  })

  test('uses Algolia with trimmed public values', () => {
    expect(
      resolveSearchConfig({
        PUBLIC_ALGOLIA_APP_ID: ' APP ',
        PUBLIC_ALGOLIA_INDEX_NAME: ' cc-blog ',
        PUBLIC_ALGOLIA_SEARCH_API_KEY: ' search-only '
      })
    ).toEqual({
      algolia: {
        apiKey: 'search-only',
        appId: 'APP',
        indexName: 'cc-blog'
      },
      mode: 'algolia'
    })
  })
})
