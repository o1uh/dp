export const QUERY_KEYS = {
  TRACKS: {
    LIST: (userId?: string) => ['tracks', 'list', userId],
    DETAILS: (id: string) => ['tracks', 'details', id],
  },
  PROFILE: {
    ME: ['profile', 'me'],
  },
  CATALOG: {
    SEARCH: (params: any) => ['catalog', 'search', params],
  },
};