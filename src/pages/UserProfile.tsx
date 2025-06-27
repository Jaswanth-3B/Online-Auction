import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { Product, Purchase } from '../types';
import { useNavigate } from 'react-router-dom';

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [myPurchases, setMyPurchases] = useState<Purchase[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        // Fetch user's auctions that are not fully completed (sold and paid)
        // Get all products where seller_id = user.id and (status != 'sold' OR (status = 'sold' AND payment is pending))
        // We'll need to fetch purchases to check payment status for sold items
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });
        if (productsError) throw productsError;

        // Fetch purchases for these products
        const productIds = (products || []).filter(p => p.status === 'sold').map(p => p.id);
        let soldPurchases: any[] = [];
        if (productIds.length > 0) {
          const { data: purchasesForSold } = await supabase
            .from('purchases')
            .select('product_id, payment_status')
            .in('product_id', productIds);
          soldPurchases = purchasesForSold || [];
        }
        // Filter: keep if not sold, or if sold but payment is not completed
        // Only keep active auctions with at least one bid
        let myActiveAuctions = (products || []).filter(p =>
          p.status === 'active'
        );
        // For each active auction, check if it has at least one bid
        if (myActiveAuctions.length > 0) {
          const productIdsWithBids: string[] = [];
          for (const prod of myActiveAuctions) {
            const { count } = await supabase
              .from('bids')
              .select('*', { count: 'exact', head: true })
              .eq('product_id', prod.id);
            if (count && count > 0) {
              productIdsWithBids.push(prod.id);
            }
          }
          myActiveAuctions = myActiveAuctions.filter(p => productIdsWithBids.includes(p.id));
        }
        setMyProducts(myActiveAuctions);

        // Fetch user's purchased items
        const { data: purchases, error: purchasesError } = await supabase
          .from('purchases')
          .select('*')
          .eq('buyer_id', user.id)
          .order('purchase_date', { ascending: false });
        if (purchasesError) throw purchasesError;
        setMyPurchases(purchases || []);

        // Fetch ended/sold auctions where user placed a bid but did not win
        const { data: lostProducts } = await supabase
          .from('products')
          .select('id, title, status')
          .in('status', ['ended', 'sold'])
          .neq('seller_id', user.id);
        let lostNotifications: any[] = [];
        if (lostProducts && lostProducts.length > 0) {
          // For each ended product, check if user placed a bid but did not win
          for (const product of lostProducts) {
            const { data: topBid } = await supabase
              .from('bids')
              .select('*')
              .eq('product_id', product.id)
              .order('bid_amount', { ascending: false })
              .limit(1)
              .single();
            if (topBid && topBid.user_id !== user.id) {
              // Check if user placed any bid
              const { count } = await supabase
                .from('bids')
                .select('*', { count: 'exact', head: true })
                .eq('product_id', product.id)
                .eq('user_id', user.id);
              if (count && count > 0) {
                lostNotifications.push({
                  type: 'lost',
                  productTitle: product.title,
                  productId: product.id
                });
              }
            }
          }
        }
        // Fetch purchases with pending payment
        const pendingPurchases = (purchases || []).filter(p => p.payment_status === 'pending');
        const wonNotifications = pendingPurchases.map(p => ({
          type: 'won',
          productTitle: p.product_title,
          productId: p.product_id,
          purchaseId: p.id
        }));
        setNotifications([...wonNotifications, ...lostNotifications]);
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
    <div className="px-4 py-8 min-h-screen">
      <div className="max-w-4xl mx-auto bg-[rgba(24,25,27,0.92)] border-2 border-[#18191b] rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-white" style={{ textShadow: '2px 2px 6px #000, 0 0 2px #000' }}>
            My Profile
          </h1>
          <button
            onClick={handleSignOut}
            className="button button-orange"
          >
            Sign Out
          </button>
        </div>

        {/* Notifications Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            Notifications
            {notifications.length > 0 && (
              <span className="ml-2 inline-block w-3 h-3 bg-orange-500 rounded-full"></span>
            )}
          </h2>
          {notifications.length === 0 ? (
            <p className="text-gray-400">No new notifications.</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((notif, idx) => (
                <li key={idx} className="bg-[rgba(255,255,255,0.04)] border border-[#444] rounded-lg p-3 flex items-center justify-between">
                  {notif.type === 'won' ? (
                    <>
                      <span className="text-green-300 font-semibold">You won: {notif.productTitle}</span>
                      <button
                        className="ml-4 px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 border border-green-500 shadow-sm transition"
                        onClick={() => navigate(`/payment/${notif.productId}`)}
                      >
                        Pay Now
                      </button>
                    </>
                  ) : (
                    <span className="text-red-400 font-semibold">You lost: {notif.productTitle}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* My Auctions Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">My Active Auctions</h2>
          {myProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myProducts.map((product) => (
                <div key={product.id} className="bg-[rgba(255,255,255,0.04)] border border-[#444] rounded-lg shadow-md p-4">
                  <h3 className="text-lg font-medium text-white">{product.title}</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Current Price: ${product.current_price.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-300">
                    Status: {product.status}
                  </p>
                  <p className="text-sm text-gray-300">
                    Ends: {new Date(product.end_time).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">You have no active auctions.</p>
          )}
        </div>

        {/* Purchased Items Section */}
        <div className="mt-8 bg-[rgba(255,255,255,0.04)] border-2 border-orange-300 rounded-2xl shadow-2xl p-6 transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_8px_32px_0_rgba(255,152,0,0.15)]">
          <h2 className="text-xl font-semibold text-white mb-4">Items You Purchased</h2>
          {myPurchases.length > 0 ? (
            <div className="space-y-4">
              {myPurchases.map((purchase) => (
                <div key={purchase.id} className="bg-[rgba(255,255,255,0.04)] border border-[#444] rounded-lg shadow-md p-4">
                  <div className="flex items-center space-x-4">
                    {purchase.product_image_url ? (
                      <img
                        src={purchase.product_image_url}
                        alt={purchase.product_title}
                        className="w-16 h-16 object-cover rounded-md border border-[#444]"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-[#232323] border border-[#444] rounded-md flex items-center justify-center">
                        <span className="text-gray-500 text-sm">No image</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white">{purchase.product_title}</h3>
                      <p className="text-sm text-gray-300">
                        Purchase Date: {new Date(purchase.purchase_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-300">
                        Amount Paid: <span className="font-semibold text-green-400">${purchase.winning_bid_amount.toFixed(2)}</span>
                      </p>
                      <p className="text-sm text-gray-300">
                        Status: <span className={`font-semibold ${
                          purchase.payment_status === 'completed' ? 'text-green-400' : 
                          purchase.payment_status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)}
                        </span>
                        {purchase.payment_status === 'pending' && (
                          <button
                            className="ml-4 px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 border border-green-500 shadow-sm transition"
                            onClick={() => navigate(`/payment/${purchase.product_id}`)}
                          >
                            Pay Now
                          </button>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">You haven't purchased any items yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 