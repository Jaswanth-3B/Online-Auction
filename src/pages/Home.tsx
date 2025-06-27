import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { Product } from '../types';
import { insertTestProducts } from '../utils/testData';
import AuctionCard from '../components/AuctionCard';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAddTestData = async () => {
    if (!user) {
      alert('Please log in to add test data');
      return;
    }
    await insertTestProducts(user.id);
    await fetchProducts();
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
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-5xl font-extrabold text-white text-center" style={{ textShadow: '2px 2px 6px #000, 0 0 2px #000' }}>
          Active Auctions
        </h1>
        <div className="flex justify-end mt-6 space-x-4">
          <button
            onClick={handleAddTestData}
            className="button button-green"
          >
            Add Test Data
          </button>
          <button
            onClick={() => navigate('/create-product')}
            className="button button-orange"
          >
            Create Auction
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="button button-purple"
          >
            My Profile
          </button>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-700 mb-2">No active auctions</h2>
          <p className="text-gray-600">Check back later for new auctions.</p>
          {user ? (
            <button
              onClick={handleAddTestData}
              className="mt-4 button button-green"
            >
              Add Example Auctions
            </button>
          ) : (
            <p className="mt-4 text-gray-600">Log in to add example auctions</p>
          )}
        </div>
      ) : (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-y-12 gap-x-10 mt-8">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="block"
            >
              <AuctionCard
                title={product.title}
                description={product.description}
                price={product.current_price}
                imageUrl={product.image_url}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;