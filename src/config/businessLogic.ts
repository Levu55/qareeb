export const DEMO_OTP = '123456';
export const DEMO_REFERRAL = 'QAREEB2026';
export const DIGITAL_PAYMENT_THRESHOLD = 1500;

export type ServiceCategoryId = string;

export interface ServiceCategory {
  id: ServiceCategoryId;
  name: string;
  baseRate: number;
  femaleHelpersAvailable: boolean;
  iconName: string;
}

export const SERVICE_CATEGORIES = [
  { id: 'cleaning', name: 'Home Cleaning', baseRate: 1000, femaleHelpersAvailable: true, iconName: 'Sparkles' },
  { id: 'plumbing', name: 'Plumbing', baseRate: 1200, femaleHelpersAvailable: false, iconName: 'Droplets' },
  { id: 'electrical', name: 'Electrical', baseRate: 1000, femaleHelpersAvailable: false, iconName: 'Zap' },
  { id: 'tutoring', name: 'Tutoring', baseRate: 800, femaleHelpersAvailable: true, iconName: 'BookOpen' },
  { id: 'beauty', name: 'Beauty & Makeup', baseRate: 1500, femaleHelpersAvailable: true, iconName: 'Scissors' },
  { id: 'appliances', name: 'AC & Appliances', baseRate: 1500, femaleHelpersAvailable: false, iconName: 'Wrench' },
  { id: 'home_repairs', name: 'Home Repairs', baseRate: 1500, femaleHelpersAvailable: false, iconName: 'Wrench' },
  { id: 'tailoring', name: 'Tailoring', baseRate: 800, femaleHelpersAvailable: true, iconName: 'Scissors' },
  { id: 'tech_support', name: 'Tech Support', baseRate: 1200, femaleHelpersAvailable: false, iconName: 'MonitorSmartphone' },
  { id: 'household', name: 'Household Assist', baseRate: 500, femaleHelpersAvailable: true, iconName: 'ShoppingBag' },
  { id: 'gardening', name: 'Gardening', baseRate: 1000, femaleHelpersAvailable: false, iconName: 'Heart' },
  { id: 'events', name: 'Event Setup', baseRate: 2000, femaleHelpersAvailable: true, iconName: 'Star' }
];

export const DEMO_HELPERS = [
  {
    id: 'h4',
    name: 'Faizan Ahmed',
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=200&auto=format&fit=crop',
    verified: true,
    rating: 4.9,
    reviews: 142,
    completedTasks: 310,
    experience: '8 years',
    responseRate: '100%',
    skills: 'Electrical • Tech Support • Repairs',
    categories: ['electrical', 'tech_support', 'home_repairs'],
    bio: 'Licensed electrician and technical expert with deep experience in smart home setups and electrical troubleshooting.',
    eta: '10 min',
    distance: '1.5 km',
    female: false
  },
  {
    id: 'h1',
    name: 'Ayesha Khan',
    photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=200&auto=format&fit=crop',
    verified: true,
    rating: 4.9,
    reviews: 126,
    completedTasks: 248,
    experience: '4 years',
    responseRate: '98%',
    skills: 'Cleaning • Home Assistance • Organization',
    categories: ['cleaning', 'errands', 'elderly'],
    bio: 'Experienced and verified professional dedicated to providing high-quality assistance for your home needs.',
    eta: '12 min',
    distance: '2.1 km',
    female: true
  },
  {
    id: 'h2',
    name: 'Tariq Mehmood',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    verified: true,
    rating: 4.8,
    reviews: 95,
    completedTasks: 180,
    experience: '5 years',
    responseRate: '95%',
    skills: 'Plumbing • Repairs • Maintenance',
    categories: ['plumbing', 'home_repairs'],
    bio: 'Skilled technician with 5 years of experience in residential repairs.',
    eta: '15 min',
    distance: '3.5 km',
    female: false
  },
  {
    id: 'h3',
    name: 'Sadia Ali',
    photo: 'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?q=80&w=200&auto=format&fit=crop',
    verified: true,
    rating: 4.9,
    reviews: 210,
    completedTasks: 350,
    experience: '6 years',
    responseRate: '99%',
    skills: 'Tutoring • Errands • Elderly Care',
    categories: ['tutoring', 'errands', 'elderly', 'beauty'],
    bio: 'Reliable and caring professional. Perfect for errands and caring for your loved ones.',
    eta: '8 min',
    distance: '1.2 km',
    female: true
  }
];
