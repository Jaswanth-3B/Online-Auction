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

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
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
          .order('bid_amount', { ascending: false });

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

  const isAuctionEnded = new Date(product.end_time) < new Date();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.title}</h1>
            <p className="text-gray-600 mb-6">{product.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Price</h2>
                <p className="text-3xl font-bold text-indigo-600">${product.current_price.toFixed(2)}</p>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Auction Ends</h2>
                <p className="text-lg text-gray-600">
                  {new Date(product.end_time).toLocaleString()}
                  {isAuctionEnded && <span className="text-red-500 ml-2">(Ended)</span>}
                </p>
              </div>
            </div>

            {user && !isAuctionEnded && (
              <form onSubmit={handleBid} className="mb-8">
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min={product.current_price + 1}
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder={`Enter bid amount (min: $${(product.current_price + 1).toFixed(2)})`}
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Place Bid
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </form>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bid History</h2>
              {bids.length > 0 ? (
                <div className="space-y-4">
                  {bids.map((bid) => (
                    <div key={bid.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">${bid.bid_amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(bid.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        Bidder: {bid.user_id === user?.id ? 'You' : 'Anonymous'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No bids yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails; 