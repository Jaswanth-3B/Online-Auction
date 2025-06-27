import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { Product, Purchase } from '../types';

const Payment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [winningBid, setWinningBid] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [existingPurchase, setExistingPurchase] = useState<Purchase | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchAuctionData = async () => {
      if (!id || !user) return;
      setShowPaymentForm(false);
      try {
        // Fetch product details
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .in('status', ['ended', 'sold'])
          .single();
        if (productError) throw productError;
        setProduct(productData);

        // Fetch highest bid to determine winning amount
        const { data: bids, error: bidsError } = await supabase
          .from('bids')
          .select('*')
          .eq('product_id', id)
          .order('bid_amount', { ascending: false })
          .limit(1)
          .single();
        if (bidsError) throw bidsError;
        if (bids.user_id !== user.id) {
          setError('You are not the winner of this auction');
          return;
        }
        setWinningBid(bids.bid_amount);

        // Check if purchase already exists
        const { data: purchase } = await supabase
          .from('purchases')
          .select('*')
          .eq('product_id', id)
          .eq('buyer_id', user.id)
          .single();
        if (purchase) {
          setExistingPurchase(purchase);
          if (purchase.payment_status === 'completed') {
            setError('Payment already completed for this item');
            setShowPaymentForm(false);
          } else if (purchase.payment_status === 'pending') {
            setShowPaymentForm(true);
          }
        } else {
          setShowPaymentForm(true);
        }
      } catch (error) {
        console.error('Error fetching auction data:', error);
        setError('Failed to load auction data');
      } finally {
        setLoading(false);
      }
    };
    fetchAuctionData();
  }, [id, user]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;
    setProcessing(true);
    setError('');
    try {
      // If purchase already exists and is pending, update it to completed
      if (existingPurchase && existingPurchase.payment_status === 'pending') {
        const { error: updatePurchaseError } = await supabase
          .from('purchases')
          .update({ payment_status: 'completed', purchase_date: new Date().toISOString() })
          .eq('id', existingPurchase.id);
        if (updatePurchaseError) throw updatePurchaseError;
      } else if (!existingPurchase) {
        // Create purchase record
        const { data: purchase, error: purchaseError } = await supabase
          .from('purchases')
          .insert([{
            product_id: product.id,
            buyer_id: user.id,
            seller_id: product.seller_id,
            winning_bid_amount: winningBid,
            payment_status: 'completed',
            purchase_date: new Date().toISOString(),
            product_title: product.title,
            product_image_url: product.image_url
          }])
          .select()
          .single();
        if (purchaseError) throw purchaseError;
      }
      // Only now, after payment, update product status to sold
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'sold' })
        .eq('id', product.id);
      if (updateError) throw updateError;
      setShowSuccess(true);
    } catch (error) {
      console.error('Payment error:', error);
      setError('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Auction Not Found</h2>
          <p className="text-gray-600 mb-4">This auction may not exist or has not ended.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <span className="inline-block bg-green-100 text-green-700 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-green-700">Payment Successful!</h2>
          <p className="text-gray-700 mb-6">Your payment was completed successfully. You will receive an email confirmation shortly.</p>
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-semibold"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 min-h-screen">
      <div className="max-w-4xl mx-auto bg-[rgba(24,25,27,0.92)] border-2 border-[#18191b] rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-extrabold text-white mb-8 text-center" style={{ textShadow: '2px 2px 6px #000, 0 0 2px #000' }}>Complete Your Purchase</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Details */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Item Details</h2>
            <div className="bg-[rgba(255,255,255,0.04)] border border-[#444] rounded-lg p-4">
              <div className="flex items-center space-x-4 mb-4">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-20 h-20 object-cover rounded-md border border-[#444]"
                  />
                ) : (
                  <div className="w-20 h-20 bg-[#232323] border border-[#444] rounded-md flex items-center justify-center">
                    <span className="text-gray-500 text-sm">No image</span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium text-white">{product.title}</h3>
                  <p className="text-sm text-gray-300">{product.description}</p>
                </div>
              </div>
              <div className="border-t border-[#444] pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Winning Bid:</span>
                  <span className="text-2xl font-bold text-orange-400">${winningBid.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Payment Information</h2>
            {showPaymentForm && (
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-md border border-[#444] bg-[#232323] text-white shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base py-3 px-4"
                  >
                    <option value="card">Credit/Debit Card</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>

                {paymentMethod === 'card' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Card Number
                      </label>
                      <input
                        type="text"
                        name="number"
                        value={cardDetails.number}
                        onChange={handleInputChange}
                        placeholder="1234 5678 9012 3456"
                        className="w-full rounded-md border border-[#444] bg-[#232323] text-white shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base py-3 px-4"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          name="expiry"
                          value={cardDetails.expiry}
                          onChange={handleInputChange}
                          placeholder="MM/YY"
                          className="w-full rounded-md border border-[#444] bg-[#232323] text-white shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base py-3 px-4"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          CVV
                        </label>
                        <input
                          type="text"
                          name="cvv"
                          value={cardDetails.cvv}
                          onChange={handleInputChange}
                          placeholder="123"
                          className="w-full rounded-md border border-[#444] bg-[#232323] text-white shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base py-3 px-4"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={cardDetails.name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className="w-full rounded-md border border-[#444] bg-[#232323] text-white shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base py-3 px-4"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="border-t border-[#444] pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-medium text-white">Total Amount:</span>
                    <span className="text-2xl font-bold text-orange-400">${winningBid.toFixed(2)}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className={`w-full py-3 px-4 border-2 border-orange-500 rounded-xl shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition ${
                      processing
                        ? 'bg-gray-400 cursor-not-allowed border-gray-500'
                        : ''
                    }`}
                  >
                    {processing ? 'Processing Payment...' : 'Complete Payment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment; 