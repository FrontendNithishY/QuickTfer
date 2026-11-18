export interface Paste {
  id?: number;
  slug: string;
  title: string;
  content: string | null;
  isEncrypted: boolean;
  visibility: "public" | "unlisted" | "private";
  expiresAt: number | null;
  burnAfterReading: boolean;
  viewCount: number | null;
  showViewCount: boolean;
  allowComments: boolean;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export interface User {
  id: number;
  username: string;
  email: string | null;
  bio?: string;
}

export interface QuickShareData {
  code: string;
  expiresAt: number;
  remainingSeconds: number;
  pasteUrl: string;
  quickAccessUrl: string;
  qrCodeDataUrl: string;
  slug: string;
  title: string;
}

export interface Comment {
  id: number;
  author_name: string;
  content: string;
  created_at: number;
}

export interface DuoSession {
  pin: string;
  title: string;
  content: string;
  version: number;
  host_client_id: string;
  guest_client_id?: string | null;
  is_active: number;
  published_slug?: string | null;
  last_active_at: number;
  created_at: number;
}

