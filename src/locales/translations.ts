export const translations = {
  en: {
    // General
    login: 'Login',
    signup: 'Sign Up',
    welcome: 'Welcome to Qareeb',
    tagline: 'Find trusted help near you.',
    phone_number: 'Mobile Number',
    password: 'Password',
    verify_continue: 'Verify & Continue',
    
    // User Home
    find_help_now: 'Find Help Now',
    switch_helper: 'Switch to Helper Mode',
    switch_user: 'Switch to User Mode',
    home: 'Home',
    bookings: 'Bookings',
    messages: 'Messages',
    profile: 'Profile',
    wallet_balance: 'Wallet Balance',
    
    // Categories
    cat_cleaning: 'Cleaning',
    cat_moving: 'Moving',
    cat_tutoring: 'Tutoring',
    cat_plumbing: 'Plumbing',
    cat_electrical: 'Electrical',
    cat_women: 'Women Services',
    more: 'More',
    
    // Post Task
    post_task_title: 'Request Help',
    category: 'Category',
    description: 'Description',
    location: 'Location',
    time: 'Time',
    payment_method: 'Payment Method',
    cash: 'Cash',
    wallet: 'Wallet',
    find_helpers: 'Find Helpers',
    
    // Helper Home
    available_jobs: 'Available Jobs',
    earnings: 'Earnings',
    net_earnings: 'Net Earnings',
    accept_job: 'Accept Job',
    decline: 'Decline',
    
    // Admin
    admin_dashboard: 'Admin Dashboard',
    flagged_issues: 'Flagged Issues',
    cnic_queue: 'CNIC Queue',
    disputes: 'Disputes',
    finance: 'Finance',
    reports: 'Reports',
  },
  ur: {
    // General
    login: 'لاگ ان کریں',
    signup: 'سائن اپ کریں',
    welcome: 'قریب میں خوش آمدید',
    tagline: 'اپنے قریب قابل اعتماد مدد تلاش کریں۔',
    phone_number: 'موبائل نمبر',
    password: 'پاس ورڈ',
    verify_continue: 'تصدیق کریں اور جاری رکھیں',
    
    // User Home
    find_help_now: 'ابھی مدد تلاش کریں',
    switch_helper: 'ہیلپر موڈ پر جائیں',
    switch_user: 'یوزر موڈ پر جائیں',
    home: 'ہوم',
    bookings: 'بکنگز',
    messages: 'پیغامات',
    profile: 'پروفائل',
    wallet_balance: 'بٹوے کا بیلنس',
    
    // Categories
    cat_cleaning: 'صفائی',
    cat_moving: 'منتقلی',
    cat_tutoring: 'ٹیوشن',
    cat_plumbing: 'پلمبنگ',
    cat_electrical: 'بجلی',
    cat_women: 'خواتین کی خدمات',
    more: 'مزید',
    
    // Post Task
    post_task_title: 'مدد کی درخواست کریں',
    category: 'زمرہ',
    description: 'تفصیل',
    location: 'مقام',
    time: 'وقت',
    payment_method: 'ادائیگی کا طریقہ',
    cash: 'نقد',
    wallet: 'بٹوہ',
    find_helpers: 'ہیلپرز تلاش کریں',
    
    // Helper Home
    available_jobs: 'دستیاب نوکریاں',
    earnings: 'آمدنی',
    net_earnings: 'خالص آمدنی',
    accept_job: 'نوکری قبول کریں',
    decline: 'مسترد کریں',
    
    // Admin
    admin_dashboard: 'ایڈمن ڈیش بورڈ',
    flagged_issues: 'نشان زدہ مسائل',
    cnic_queue: 'شناختی کارڈ کی قطار',
    disputes: 'تنازعات',
    finance: 'مالیات',
    reports: 'رپورٹس',
  }
};

export type TranslationKey = keyof typeof translations.en;
