import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

function getLocalDescriptionSuggestion(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('camera')) {
    return 'Capture memories with this high-quality camera, perfect for photography enthusiasts and collectors.';
  }
  if (lower.includes('watch')) {
    return 'A timeless piece for your collection. This watch combines elegance and precision.';
  }
  if (lower.includes('console') || lower.includes('playstation') || lower.includes('xbox') || lower.includes('nintendo')) {
    return 'Experience next-level gaming with this powerful console, ready for hours of entertainment.';
  }
  if (lower.includes('phone') || lower.includes('smartphone')) {
    return 'Stay connected with this feature-packed smartphone, offering performance and style.';
  }
  if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('notebook')) {
    return 'Boost your productivity with this reliable and high-performance laptop.';
  }
  if (lower.includes('car')) {
    return 'Drive in style with this well-maintained car, perfect for daily commutes or road trips.';
  }
  if (lower.includes('bike') || lower.includes('bicycle')) {
    return 'Enjoy the outdoors with this sturdy and comfortable bike, ideal for all terrains.';
  }
  if (lower.includes('book')) {
    return 'Dive into a world of knowledge and adventure with this must-read book.';
  }
  if (lower.includes('jewelry') || lower.includes('ring') || lower.includes('necklace')) {
    return 'Add a touch of elegance to your collection with this exquisite piece of jewelry.';
  }
  if (lower.includes('painting') || lower.includes('art')) {
    return 'Enhance your space with this beautiful artwork, a true conversation starter.';
  }
  if (lower.includes('furniture') || lower.includes('sofa') || lower.includes('table') || lower.includes('chair')) {
    return 'Upgrade your home with this stylish and comfortable piece of furniture.';
  }
  if (lower.includes('collectible') || lower.includes('coin') || lower.includes('stamp')) {
    return 'A rare collectible item, perfect for enthusiasts and serious collectors alike.';
  }
  if (lower.includes('toy') || lower.includes('lego') || lower.includes('action figure')) {
    return 'Bring joy to kids and collectors with this fun and sought-after toy.';
  }
  if (lower.includes('shoes') || lower.includes('sneaker')) {
    return 'Step out in style with these fashionable and comfortable shoes.';
  }
  if (lower.includes('bag') || lower.includes('handbag') || lower.includes('backpack')) {
    return 'Carry your essentials in style with this versatile and trendy bag.';
  }
  if (lower.includes('instrument') || lower.includes('guitar') || lower.includes('piano')) {
    return 'Make music with this quality instrument, perfect for beginners and pros alike.';
  }
  // Add more as needed...
  // Default template
  return `Introducing "${title}" – a unique item now available for auction!`;
}

const CreateProduct: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    starting_price: '',
    end_time: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestedDescription, setSuggestedDescription] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(null);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, title: value }));
    setSuggestedDescription(getLocalDescriptionSuggestion(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    let imageUrl: string | null = null;

    try {
      // Upload image to Supabase Storage if a file is selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images') // Ensure you have a bucket named 'product-images' in Supabase Storage
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Get the public URL of the uploaded image
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      // Insert product data into the database
      const { error: insertError } = await supabase.from('products').insert([
        {
          title: formData.title,
          description: formData.description,
          starting_price: parseFloat(formData.starting_price),
          current_price: parseFloat(formData.starting_price),
          end_time: new Date(formData.end_time).toISOString(),
          seller_id: user.id,
          status: 'active',
          image_url: imageUrl, // Store the image URL
        },
      ]);

      if (insertError) throw insertError;

      navigate('/');
    } catch (error: any) {
      console.error('Error creating auction:', error);
      setError(error.message || 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-8 min-h-screen">
      <div className="max-w-2xl mx-auto bg-[rgba(24,25,27,0.92)] border-2 border-[#18191b] rounded-2xl shadow-lg p-8">
        <h1 className="text-4xl font-extrabold text-white text-center mb-8" style={{ textShadow: '2px 2px 6px #000, 0 0 2px #000' }}>
          Create New Auction
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-lg font-semibold text-white mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleTitleChange}
              className="mt-1 block w-full rounded-md border border-[#444] bg-[#232323] text-white placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base py-2 px-3"
              placeholder="Enter auction title"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-lg font-semibold text-white mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              required
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-[#444] bg-[#232323] text-white placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base py-2 px-3"
              placeholder="Enter auction description"
            />
            {suggestedDescription && (
              <div className="mt-2 text-sm text-orange-300 cursor-pointer hover:underline" onClick={() => setFormData((prev) => ({ ...prev, description: suggestedDescription }))}>
                Suggestion: {suggestedDescription}
              </div>
            )}
            <div className="mt-2 text-xs text-gray-400">
              Supported keywords: camera, watch, console, phone, laptop, car, bike, book, jewelry, painting, furniture, collectible, toy, shoes, bag, instrument
            </div>
          </div>

          <div>
            <label htmlFor="startingPrice" className="block text-lg font-semibold text-white mb-2">
              Starting Price ($)
            </label>
            <input
              type="number"
              id="startingPrice"
              name="starting_price"
              required
              value={formData.starting_price}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-[#444] bg-[#232323] text-white placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base py-2 px-3 hide-number-arrows"
              placeholder="Enter starting price"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label htmlFor="end_time" className="block text-lg font-semibold text-white mb-2">
              Auction End Time
            </label>
            <input
              type="datetime-local"
              id="end_time"
              name="end_time"
              required
              value={formData.end_time}
              onChange={handleChange}
              min={new Date().toISOString().slice(0, 16)}
              className="mt-1 block w-full rounded-md border border-[#444] bg-[#232323] text-white placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base py-2 px-3"
              placeholder="Select end time"
            />
          </div>

          <div>
            <label htmlFor="image" className="block text-lg font-semibold text-white mb-2">
              Product Image
            </label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className="file-matte"
            />
            {imageFile && <p className="mt-2 text-sm text-gray-300">Selected file: {imageFile.name}</p>}
          </div>

          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="button bg-[#232323] text-white border border-[#444] hover:bg-[#18191b]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="button button-orange"
            >
              {loading ? 'Creating...' : 'Create Auction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProduct; 