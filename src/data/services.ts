import { 
  Home, Truck, Wrench, Heart, Tent, Scissors, Plus, 
  ShoppingBag, Droplets, Zap, Box, ArrowRight, UserCheck, 
  Computer, Monitor, Gift, ChefHat, Shirt
} from 'lucide-react';

export const CATEGORIES = [
  { id: 'home', name: 'Home & Cleaning', icon: Home, color: 'bg-green-100 text-green-600', description: 'Cleaning, Cooking, Laundry, Organizing' },
  { id: 'errands', name: 'Errands & Delivery', icon: ShoppingBag, color: 'bg-blue-100 text-blue-600', description: 'Grocery, Pick & Drop, Local Errands' },
  { id: 'moving', name: 'Moving & Physical Help', icon: Truck, color: 'bg-indigo-100 text-indigo-600', description: 'Moving, Lifting, Loading, Furniture' },
  { id: 'repairs', name: 'Repairs & Technical', icon: Wrench, color: 'bg-orange-100 text-orange-600', description: 'Electrical, Plumbing, Appliance' },
  { id: 'care', name: 'Personal & Care', icon: Heart, color: 'bg-pink-100 text-pink-600', description: 'Elderly Assistance, Patient Care' },
  { id: 'events', name: 'Events', icon: Tent, color: 'bg-purple-100 text-purple-600', description: 'Setup, Decoration, Serving' },
  { id: 'skills', name: 'Skills & Creative', icon: Scissors, color: 'bg-teal-100 text-teal-600', description: 'Sewing, Tailoring, Computer Help' },
  { id: 'other', name: 'Other', icon: Plus, color: 'bg-gray-100 text-gray-600', description: 'Any other task' }
];

export const SERVICES = [
  // Home & Cleaning
  { id: 'cleaning', categoryId: 'home', name: 'Cleaning', icon: Home, rating: 4.8, jobsCount: '1.5k+' },
  { id: 'cooking', categoryId: 'home', name: 'Cooking', icon: ChefHat, rating: 4.9, jobsCount: '1.2k+' },
  { id: 'laundry', categoryId: 'home', name: 'Laundry', icon: Shirt, rating: 4.8, jobsCount: '950+' },
  { id: 'organizing', categoryId: 'home', name: 'Organizing', icon: Box, rating: 4.9, jobsCount: '2.1k+' },

  // Errands & Delivery
  { id: 'grocery', categoryId: 'errands', name: 'Grocery Shopping', icon: ShoppingBag, rating: 4.7, jobsCount: '800+' },
  { id: 'pickdrop', categoryId: 'errands', name: 'Pick & Drop', icon: ArrowRight, rating: 4.6, jobsCount: '600+' },
  { id: 'local_errands', categoryId: 'errands', name: 'Local Errands', icon: ShoppingBag, rating: 4.8, jobsCount: '1.1k+' },
  { id: 'document', categoryId: 'errands', name: 'Document Delivery', icon: Box, rating: 4.9, jobsCount: '400+' },

  // Moving & Physical Help
  { id: 'moving_items', categoryId: 'moving', name: 'Moving Items', icon: Truck, rating: 4.7, jobsCount: '750+' },
  { id: 'lifting', categoryId: 'moving', name: 'Lifting', icon: Truck, rating: 4.8, jobsCount: '500+' },
  { id: 'loading', categoryId: 'moving', name: 'Loading / Unloading', icon: Box, rating: 4.9, jobsCount: '300+' },
  { id: 'furniture', categoryId: 'moving', name: 'Furniture Help', icon: Wrench, rating: 4.7, jobsCount: '900+' },

  // Repairs & Technical
  { id: 'electrical', categoryId: 'repairs', name: 'Electrical', icon: Zap, rating: 4.8, jobsCount: '650+' },
  { id: 'plumbing', categoryId: 'repairs', name: 'Plumbing', icon: Droplets, rating: 4.8, jobsCount: '650+' },
  { id: 'appliance', categoryId: 'repairs', name: 'Appliance Help', icon: Wrench, rating: 4.8, jobsCount: '650+' },
  { id: 'general_repair', categoryId: 'repairs', name: 'General Repair', icon: Wrench, rating: 4.8, jobsCount: '650+' },

  // Personal & Care
  { id: 'elderly_care', categoryId: 'care', name: 'Elderly Assistance', icon: Heart, rating: 4.8, jobsCount: '650+' },
  { id: 'patient_care', categoryId: 'care', name: 'Patient Care', icon: Heart, rating: 4.8, jobsCount: '650+' },
  { id: 'personal_assistant', categoryId: 'care', name: 'Personal Assistance', icon: UserCheck, rating: 4.8, jobsCount: '650+' },

  // Events
  { id: 'event_setup', categoryId: 'events', name: 'Event Setup', icon: Tent, rating: 4.8, jobsCount: '650+' },
  { id: 'event_assistance', categoryId: 'events', name: 'Event Assistance', icon: Tent, rating: 4.8, jobsCount: '650+' },
  { id: 'decoration_help', categoryId: 'events', name: 'Decoration Help', icon: Gift, rating: 4.8, jobsCount: '650+' },
  { id: 'serving', categoryId: 'events', name: 'Serving Assistance', icon: ChefHat, rating: 4.8, jobsCount: '650+' },

  // Skills & Creative
  { id: 'sewing', categoryId: 'skills', name: 'Sewing', icon: Scissors, rating: 4.8, jobsCount: '650+' },
  { id: 'tailoring', categoryId: 'skills', name: 'Tailoring', icon: Scissors, rating: 4.8, jobsCount: '650+' },
  { id: 'computer_help', categoryId: 'skills', name: 'Computer Help', icon: Computer, rating: 4.8, jobsCount: '650+' },
  { id: 'basic_technical', categoryId: 'skills', name: 'Basic Technical', icon: Monitor, rating: 4.8, jobsCount: '650+' },

  // Other
  { id: 'other_task', categoryId: 'other', name: 'Other Task', icon: Plus, rating: 4.8, jobsCount: '650+' }
];
