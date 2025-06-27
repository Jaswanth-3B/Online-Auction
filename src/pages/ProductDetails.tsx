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
  const [isWinner, setIsWinner] = useState(false);
  const [winningBidAmount, setWinningBidAmount] = useState<number>(0);

  const isAuctionEnded = timeLeft <= 0;

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

        // Check if current user is the winner (for ended auctions)
        if (data && data.length > 0 && timeLeft <= 0 && user) {
          const highestBid = data[0]; // Bids are ordered by amount descending
          if (highestBid.user_id === user.id) {
            setIsWinner(true);
            setWinningBidAmount(highestBid.bid_amount);
          }
        }
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

  useEffect(() => {
    if (!product) return;

    // If auction just ended and user is the winner, create a pending purchase if not exists
    const createPendingPurchase = async () => {
      if (isAuctionEnded && isWinner && user && product) {
        // Check if a purchase already exists
        const { data: existingPurchase } = await supabase
          .from('purchases')
          .select('*')
          .eq('product_id', product.id)
          .eq('buyer_id', user.id)
          .single();
        if (!existingPurchase) {
          // Create pending purchase
          await supabase.from('purchases').insert([
            {
              product_id: product.id,
              buyer_id: user.id,
              seller_id: product.seller_id,
              winning_bid_amount: winningBidAmount,
              payment_status: 'pending',
              purchase_date: new Date().toISOString(),
              product_title: product.title,
              product_image_url: product.image_url
            }
          ]);
        }
      }
    };
    createPendingPurchase();
  }, [isAuctionEnded, isWinner, user, product, winningBidAmount]);

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

  return (
    <div className="px-4 py-8 min-h-screen">
      <div className="max-w-6xl mx-auto bg-[rgba(24,25,27,0.92)] border-2 border-[#18191b] rounded-2xl shadow-lg p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Image Column */}
          <div className="flex items-center justify-center bg-[#232323] border-2 border-[#444] rounded-xl overflow-hidden max-w-[670px] max-h-[670px] mx-auto min-h-[350px]">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="object-contain w-full h-full rounded-xl"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-80 text-gray-400 text-xl">
                No image available
              </div>
            )}
          </div>

          {/* Details and Bidding Column */}
          <div>
            <h1 className="text-3xl font-extrabold mb-2 text-white" style={{ textShadow: '2px 2px 6px #000, 0 0 2px #000' }}>{product.title}</h1>
            <p className="text-gray-300 mb-4 text-lg">{product.description}</p>

            <div className="mb-6 p-4 bg-[rgba(255,152,0,0.08)] border border-orange-900 rounded-xl text-orange-300">
              <h2 className="text-lg font-semibold mb-2">Auction Ends In</h2>
              {isAuctionEnded ? (
                <div>
                  <p className="text-2xl font-bold mb-4 text-orange-200">Auction Ended</p>
                  {isWinner ? (
                    <div className="bg-[rgba(34,197,94,0.12)] border border-green-700 text-green-300 px-4 py-3 rounded-xl">
                      <p className="font-semibold mb-2">🎉 Congratulations! You won this auction!</p>
                      <p className="mb-3">Winning Bid: <span className="font-bold">${winningBidAmount.toFixed(2)}</span></p>
                      <button
                        onClick={() => navigate(`/payment/${id}`)}
                        className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-xl shadow-md transition"
                      >
                        Complete Payment
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-400">This auction has ended. Check your profile to see if you won!</p>
                  )}
                </div>
              ) : (
                <p className="text-3xl font-bold text-orange-400">
                  {formatTime(timeLeft)}
                </p>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-200">Current Price</h2>
              <p className="text-3xl font-bold text-orange-400">${product.current_price.toFixed(2)}</p>
            </div>

            {user && !isAuctionEnded && (
              <form onSubmit={handleBid} className="space-y-4 mb-6">
                <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-300">Your bid</label>
                <div className="flex items-center space-x-4">
                  <input
                    id="bidAmount"
                    type="number"
                    min={product.current_price + 0.01}
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="flex-1 rounded-md border border-[#444] bg-[#232323] text-white placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-lg py-3 px-4 hide-number-arrows"
                    placeholder={`Enter bid amount (min: $${(product.current_price + 0.01).toFixed(2)})`}
                  />
                  <button
                    type="submit"
                    disabled={loading || isAuctionEnded}
                    className={`px-6 py-2 border-2 border-orange-500 rounded-xl shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition ${isAuctionEnded ? 'bg-gray-400 cursor-not-allowed border-gray-500' : ''}`}
                  >
                    {isAuctionEnded ? 'Auction Ended' : 'Place Bid'}
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-400">{error}</p>
                )}
              </form>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-200 mb-4">Bid History</h2>
              {bids.length > 0 ? (
                <div className="space-y-4">
                  {bids.map((bid) => (
                    <div key={bid.id} className="flex justify-between items-center p-4 bg-[rgba(255,255,255,0.04)] border border-[#444] rounded-lg">
                      <div>
                        <p className="font-medium text-white">${bid.bid_amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(bid.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-sm text-gray-400">
                        Bidder: {bid.user_id === user?.id ? 'You' : 'Anonymous'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No bids yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails; 