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
