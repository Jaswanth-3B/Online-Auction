export interface User {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: {
    username?: string;
  };
}

export interface ExtendedUser {
  id: string;
  email: string;
  created_at: string;
  username: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  starting_price: number;
  current_price: number;
  end_time: string;
  seller_id: string;
  status: 'active' | 'ended' | 'cancelled' | 'sold';
  created_at: string;
  image_url?: string;
}

export interface Bid {
  id: string;
  product_id: string;
  user_id: string;
  bid_amount: number;
  timestamp: string;
}

export interface Purchase {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  winning_bid_amount: number;
  payment_status: 'pending' | 'completed' | 'failed';
  purchase_date: string;
  product_title: string;
  product_image_url?: string;
}

export interface AuthContextType {
  user: ExtendedUser | null;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
} 