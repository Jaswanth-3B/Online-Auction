# Online Auction System

A real-time auction platform built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- User authentication (sign up, login, logout)
- Create and manage auctions
- Real-time bidding system
- View auction details and bid history
- User profile with personal auctions and bids

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd auction-system
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Supabase credentials:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm start
```

## Supabase Setup

1. Create a new project in Supabase
2. Create the following tables:

### users
```sql
create table users (
  id uuid references auth.users on delete cascade,
  username text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);
```

### products
```sql
create table products (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  starting_price numeric not null,
  current_price numeric not null,
  end_time timestamp with time zone not null,
  seller_id uuid references users(id) not null,
  status text not null default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### bids
```sql
create table bids (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) not null,
  user_id uuid references users(id) not null,
  bid_amount numeric not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);
```

3. Enable Row Level Security (RLS) and create policies for each table.

## Development

The project uses:
- React with TypeScript for the frontend
- Tailwind CSS for styling
- Supabase for authentication, database, and real-time features
- React Router for navigation

## Deployment

The application can be deployed to Vercel or Netlify. Make sure to set up the environment variables in your deployment platform.

## License

MIT
