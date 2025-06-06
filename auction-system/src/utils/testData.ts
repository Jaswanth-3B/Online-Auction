import { supabase } from './supabaseClient';

export const insertTestProducts = async (userId: string) => {
  const testProducts = [
    {
      title: 'Vintage Camera',
      description: 'A beautiful vintage film camera in excellent condition. Perfect for collectors or photography enthusiasts.',
      starting_price: 150,
      current_price: 150,
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      seller_id: userId,
      status: 'active'
      // Removed image_url
    },
    {
      title: 'Gaming Console',
      description: 'Latest generation gaming console with two controllers. Barely used and in perfect condition.',
      starting_price: 400,
      current_price: 400,
      end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      seller_id: userId,
      status: 'active'
      // Removed image_url
    },
    {
      title: 'Antique Watch',
      description: 'Elegant mechanical watch from the 1950s. Recently serviced and keeps perfect time.',
      starting_price: 300,
      current_price: 300,
      end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      seller_id: userId,
      status: 'active'
      // Removed image_url
    }
  ];

  try {
    const { error } = await supabase
      .from('products')
      .insert(testProducts);

    if (error) throw error;
    console.log('Test products inserted successfully');
  } catch (error) {
    console.error('Error inserting test products:', error);
  }
};