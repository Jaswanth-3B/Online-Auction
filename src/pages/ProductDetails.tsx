import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { Product, Bid } from '../types';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        // Check if the auction has ended and update status if necessary
        if (data && data.status === 'active' && new Date(data.end_time).getTime() < Date.now()) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ status: 'ended' })
            .eq('id', id);

          if (updateError) {
            console.error('Error updating product status to ended:', updateError);
          } else {
            // If status updated successfully, use the updated data
            setProduct({ ...data, status: 'ended' });
            return; // Exit to avoid setting the old status
          }
        }

        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
        navigate('/');
      }
    };

    const fetchBids = async () => {
      try {
        const { data, error } = await supabase
          .from('bids')
          .select('*')
          .eq('product_id', id)
          .order('bid_amount', { ascending: false })
          .limit(2);

        if (error) throw error;
        setBids(data || []);
      } catch (error) {
        console.error('Error fetching bids:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    fetchBids();

    // Subscribe to real-time updates
    const productSubscription = supabase
      .channel('product')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `id=eq.${id}` }, () => {
        fetchProduct();
      })
      .subscribe();

    const bidsSubscription = supabase
      .channel('bids')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids', filter: `product_id=eq.${id}` }, () => {
        fetchBids();
      })
      .subscribe();

    return () => {
      productSubscription.unsubscribe();
      bidsSubscription.unsubscribe();
    };
  }, [id, navigate]);

  // Timer logic
  useEffect(() => {
    if (!product) return;

    const updateTimer = () => {
      // Ensure product.end_time is parsed as UTC
      const endTime = Date.parse(product.end_time);
      const now = Date.now(); // Get current time in milliseconds (UTC)
      const timeRemaining = endTime - now;
      setTimeLeft(Math.max(0, timeRemaining)); // Ensure time left is not negative
    };

    // Update immediately on mount
    updateTimer();

    // Set up interval to update every second
    const timerInterval = setInterval(updateTimer, 1000);

    // Cleanup interval on component unmount or when auction ends
    return () => clearInterval(timerInterval);
  }, [product]); // Re-run effect if product changes

  const formatTime = (ms: number) => {
    if (ms <= 0) return "Auction Ended";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`); // Show hours if days > 0 or hours > 0
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`); // Show minutes if hours > 0 or minutes > 0
    parts.push(`${seconds}s`); // Always show seconds

    return parts.join(' ');
  };

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;

    const bidAmountNum = parseFloat(bidAmount);
    if (isNaN(bidAmountNum) || bidAmountNum <= product.current_price) {
      setError('Bid amount must be higher than current price');
      return;
    }

    try {
      const { error } = await supabase.from('bids').insert([
        {
          product_id: product.id,
          user_id: user.id,
          bid_amount: bidAmountNum,
        },
      ]);

      if (error) throw error;

      // Update product current price
      const { error: updateError } = await supabase
        .from('products')
        .update({ current_price: bidAmountNum })
        .eq('id', product.id);

      if (updateError) throw updateError;

      setBidAmount('');
      setError('');
    } catch (error) {
      setError('Failed to place bid');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const isAuctionEnded = timeLeft <= 0; // Determine if auction ended based on timer

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-100 text-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md overflow-hidden p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Image Column */}
          <div className="flex items-center justify-center bg-gray-200 rounded-md overflow-hidden max-w-[670px] max-h-[670px] mx-auto">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="object-contain w-full h-full rounded-md"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-80 text-gray-500 text-xl">
                No image available
              </div>
            )}
          </div>

          {/* Details and Bidding Column */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
            <p className="text-gray-600 mb-4">{product.description}</p>

            <div className="mb-6 p-4 bg-orange-100 rounded-md text-orange-800">
              <h2 className="text-lg font-semibold mb-2">Auction Ends In</h2>
              {isAuctionEnded ? (
                <p className="text-2xl font-bold">Auction Ended</p>
              ) : (
                <p className="text-3xl font-bold">
                  {formatTime(timeLeft)}
                </p>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-700">Current Price</h2>
              <p className="text-3xl font-bold text-orange-600">${product.current_price.toFixed(2)}</p>
            </div>

            {user && !isAuctionEnded && (
              <form onSubmit={handleBid} className="space-y-4 mb-6">
                <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">Your bid</label>
                <div className="flex items-center space-x-4">
                  <input
                    id="bidAmount"
                    type="number"
                    min={product.current_price + 0.01}
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 bg-white text-gray-900"
                    placeholder={`Enter bid amount (min: $${(product.current_price + 0.01).toFixed(2)})`}
                  />
                  <button
                    type="submit"
                    disabled={loading || isAuctionEnded}
                    className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isAuctionEnded ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'}`}
                  >
                    {isAuctionEnded ? 'Auction Ended' : 'Place Bid'}
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </form>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Bid History</h2>
              {bids.length > 0 ? (
                <div className="space-y-4">
                  {bids.map((bid) => (
                    <div key={bid.id} className="flex justify-between items-center p-4 bg-gray-100 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">${bid.bid_amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(bid.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-sm text-gray-600">
                        Bidder: {bid.user_id === user?.id ? 'You' : 'Anonymous'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No bids yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails; 