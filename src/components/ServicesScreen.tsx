import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { CATEGORIES } from '../data/services';
import { ArrowLeft, Star, ChevronRight, LayoutGrid } from 'lucide-react';
import { Card } from './ui/Card';



export function ServicesScreen() {
  const navigate = useNavigate();
  const role = useAppStore(state => state.role);

  const handleBack = () => {
    navigate(role === 'helper' ? '/helper' : '/user');
  };

  const handleServiceClick = (serviceId: string) => {
    if (role === 'user') {
      navigate('/user/post'); // Redirect to posting a task with this category if desired
    } else {
      // Helper specific action, maybe view incoming requests for this category
      navigate('/helper');
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
        <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-900 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-brand-teal" />
          All Services
        </h1>
      </div>

      <div className="p-6">
        <p className="text-gray-500 text-sm mb-6">
          {role === 'user' 
            ? 'Browse all our verified service categories to find the perfect professional for your task.' 
            : 'Explore the various service categories supported by Qareeb where you can offer your expertise.'}
        </p>

        <div className="space-y-4">
          {CATEGORIES.map((category) => (
            <Card 
              key={category.id} 
              className="p-4 flex items-center gap-4 cursor-pointer hover:border-brand-teal/30 hover:shadow-md transition-all group"
              onClick={() => handleServiceClick(category.id)}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${category.color}`}>
                <category.icon className="w-7 h-7" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg mb-0.5">{category.name}</h3>
                <p className="text-sm text-gray-500 truncate">{category.description}</p>
                
                
              </div>

              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-brand-teal/10 group-hover:text-brand-teal transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
