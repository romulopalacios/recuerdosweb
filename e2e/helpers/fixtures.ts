/**
 * Shared mock data constants used across all E2E specs.
 * Mirrors the shape of the Supabase DB rows so mocked API responses
 * match what the app TypeScript types expect.
 */

export const MOCK_USER = {
  id:         'user-owner-001',
  email:      'test@recuerdos.app',
  user_metadata: { full_name: 'Test Owner' },
  aud: 'authenticated',
  role: 'authenticated',
}

export const MOCK_GUEST_USER = {
  id:         'user-guest-002',
  email:      'guest@recuerdos.app',
  user_metadata: { full_name: 'Test Guest' },
  aud: 'authenticated',
  role: 'authenticated',
}

export const MOCK_SESSION = {
  access_token:  'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in:    3600,
  token_type:    'bearer',
  user: MOCK_USER,
}

export const MOCK_CATEGORY = {
  id:          'cat-001',
  user_id:     MOCK_USER.id,
  name:        'Viajes',
  description: 'Nuestros viajes juntos',
  color:       'blue',
  icon:        'plane',
  created_at:  '2025-01-01T00:00:00.000Z',
}

export const MOCK_MEMORY = {
  id:           'mem-001',
  user_id:      MOCK_USER.id,
  title:        'Primera cita en París',
  content:      'Fue un día increíble…',
  memory_date:  '2025-06-14',
  category_id:  MOCK_CATEGORY.id,
  category:     MOCK_CATEGORY,
  location:     'París, Francia',
  mood:         'romantic',
  is_favorite:  false,
  cover_photo_url: null,
  photos:       [],
  tags:         ['viaje', 'paris'],
  created_at:   '2025-06-15T10:00:00.000Z',
  updated_at:   '2025-06-15T10:00:00.000Z',
}

export const MOCK_PHOTO = {
  id:           'photo-001',
  memory_id:    MOCK_MEMORY.id,
  user_id:      MOCK_USER.id,
  storage_path: `${MOCK_USER.id}/${MOCK_MEMORY.id}/1234567890.jpg`,
  public_url:   'https://placehold.co/800x600.jpg',
  thumb_url:    'https://placehold.co/200x200.jpg',
  caption:      'Torre Eiffel al atardecer',
  taken_at:     '2025-06-14T18:30:00.000Z',
  width:        800,
  height:       600,
  size_bytes:   512000,
  order_index:  0,
  created_at:   '2025-06-15T10:00:00.000Z',
}

export const MOCK_SHARE = {
  id:            'share-001',
  owner_id:      MOCK_USER.id,
  guest_user_id: null,
  invite_token:  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  permission:    'read',
  guest_name:    'Mi pareja',
  guest_email:   null,
  accepted_at:   null,
  expires_at:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  created_at:    new Date().toISOString(),
}

export const MOCK_STATS = {
  total_memories:   12,
  total_photos:     48,
  total_categories: 4,
  favorites:        3,
}
