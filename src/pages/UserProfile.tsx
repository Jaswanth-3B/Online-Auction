import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { Product, Bid } from '../types';

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [myBoughtItems, setMyBoughtItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Fetch user's products
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        // Fetch user's bids
        const { data: bids, error: bidsError } = await supabase
          .from('bids')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false });

        if (bidsError) throw bidsError;

        setMyProducts(products || []);
        setMyBids(bids || []);

        // TODO: Fetch user's bought items
        // This requires a query to find ended auctions where the user has the highest bid.
        // Example conceptual query (needs refinement based on your bid/product structure):
        // const { data: boughtItems, error: boughtItemsError } = await supabase
        //   .from('products')
        //   .select('*')
        //   .eq('status', 'ended')
        //   .in('id', supabase.from('bids').select('product_id').eq('user_id', user.id).order('bid_amount', { ascending: false }).limit(1)); // This is a simplified example

        // For now, setting a placeholder empty array
        setMyBoughtItems([]); // Replace with fetched data

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-100 text-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Auctions</h2>
            {myProducts.length > 0 ? (
              <div className="space-y-4">
                {myProducts.map((product) => (
                  <div key={product.id} className="bg-gray-100 rounded-lg shadow-md p-4">
                    <h3 className="text-lg font-medium text-gray-900">{product.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Current Price: ${product.current_price.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status: {product.status}
                    </p>
                    <p className="text-sm text-gray-600">
                      Ends: {new Date(product.end_time).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">You haven't created any auctions yet.</p>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Bids</h2>
            {myBids.length > 0 ? (
              <div className="space-y-4">
                {myBids.map((bid) => (
                  <div key={bid.id} className="bg-gray-100 rounded-lg shadow-md p-4">
                    <p className="text-lg font-medium text-gray-900">
                      ${bid.bid_amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Placed: {new Date(bid.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">You haven't placed any bids yet.</p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Items You Won</h2>
          {myBoughtItems.length > 0 ? (
            <div className="space-y-4">
              {/* Map over bought items here */}
              {/* Example Structure: */}
              {/* {myBoughtItems.map((item) => ( */}
              {/*   <div key={item.id} className="bg-gray-100 rounded-lg shadow-md p-4"> */}
              {/*     <h3 className="text-lg font-medium text-gray-900">{item.title}</h3> */}
              {/*     <p className="text-sm text-gray-600 mt-1">Winning Bid: ${item.winning_bid_amount.toFixed(2)}</p> */}
              {/*   </div> */}
              {/* ))} */}
              <p className="text-gray-600">Display your won items here.</p>
            </div>
          ) : (
            <p className="text-gray-600">You haven't won any auctions yet.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default UserProfile; 