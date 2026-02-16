export interface User {
  id: string;
  full_name: string;
  email: string;
  cognito_id: string;
  created_at: Date;
}

export interface Channel {
  id: string;
  owner_id: string;
  name: string;
  code: string;
  status: 'open' | 'closed';
  created_at: Date;
}

export interface AnonymousUser {
  id: string;
  channel_id: string;
  session_id: string;
  name: string;
  icon_url: string;
  icon_background_color: string;
  created_at: Date;
}

export interface Message {
  id: string;
  channel_id: string;
  anon_user_id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  sent_at: Date;
  approved_at: Date | null;
}

export interface MessageWithIdentity extends Message {
  anon_user: {
    name: string;
    icon_url: string;
    icon_background_color: string;
  };
}
