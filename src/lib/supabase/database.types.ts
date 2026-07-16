export type CommentTarget = 'guestbook' | 'post'

export interface ProfileRow {
  avatar_url: string | null
  created_at: string
  display_name: string
  id: string
  updated_at: string
}

export interface CommentRow {
  author_id: string
  body: string | null
  created_at: string
  deleted_at: string | null
  id: string
  parent_id: string | null
  target_key: string
  target_type: CommentTarget
}

export interface PostLikeRow {
  created_at: string
  post_slug: string
  user_id: string
}

export type Database = {
  public: {
    CompositeTypes: Record<string, never>
    Enums: Record<string, never>
    Functions: {
      delete_comment: { Args: { comment_id: string }; Returns: boolean }
      is_site_admin: { Args: Record<string, never>; Returns: boolean }
    }
    Tables: {
      comments: {
        Insert: Omit<CommentRow, 'body' | 'created_at' | 'deleted_at' | 'id'> & { body: string }
        Relationships: []
        Row: CommentRow
        Update: never
      }
      post_likes: {
        Insert: Omit<PostLikeRow, 'created_at'>
        Relationships: []
        Row: PostLikeRow
        Update: never
      }
      profiles: {
        Insert: Pick<ProfileRow, 'display_name' | 'id'> & Partial<ProfileRow>
        Relationships: []
        Row: ProfileRow
        Update: Partial<Pick<ProfileRow, 'avatar_url' | 'display_name' | 'updated_at'>>
      }
      site_admins: {
        Insert: never
        Relationships: []
        Row: { created_at: string; user_id: string }
        Update: never
      }
    }
    Views: Record<string, never>
  }
}
