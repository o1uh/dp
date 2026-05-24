export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  profile_specialization?: string;
  role_name?: string;
  storage_used_bytes?: number;
}