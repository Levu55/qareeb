import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { MobileShell } from './layouts/MobileShell';
import { BottomNav } from './components/BottomNav';
import { WelcomeScreen, LoginScreen, CNICVerificationScreen } from './features/auth/AuthScreens';
import { UserHome, PostTaskScreen, SelectHelperScreen, TrackingScreen, PaymentRatingScreen, CategoriesScreen } from './features/user/UserScreens';
import { BecomeHelperScreen } from './features/user/BecomeHelperScreen';
import { HelperHome, ActiveJobScreen } from './features/helper/HelperScreens';
import { WalletScreen } from './features/shared/Wallet';
import { ProfileScreen, PersonalDetailsScreen, SavedPaymentMethodsScreen, HelpSupportScreen } from './features/shared/Profile';
import { BookingsScreen } from './features/shared/Bookings';
import { MessagesScreen } from './features/shared/Messages';

import { AdminShell } from './layouts/AdminShell';
import { AdminJobsScreen } from './features/admin/AdminJobs';
import { AdminDisputesScreen } from './features/admin/AdminDisputes';
import { SuperAdminDashboard } from './features/admin/SuperAdminDashboard';
import { AdminDashboard, AdminCNICQueue, UserManagementScreen } from './features/admin/AdminScreens';

import { useAppStore } from './store/useAppStore';
import { trackPageView } from './utils/analytics';
import { useLocation } from 'react-router-dom';

import { ServicesScreen } from './components/ServicesScreen';
import { ToastContainer } from './components/ToastContainer';
import { supabase } from './lib/supabaseClient';
import { getCnicStatus } from './lib/authHelpers';
import { Role } from './store/useAppStore';

function RootRedirect() {
  const { role } = useAppStore();
  if (role === 'helper') return <Navigate to="/helper" />;
  if (role === 'user') return <Navigate to="/user" />;
  if (role === 'admin' || role === 'superadmin') return <Navigate to="/admin" />;
  return <Navigate to="/auth" />;
}

function ProtectedRoute({ children, role: requiredRole }: { children: React.ReactNode, role?: 'user' | 'helper' | 'admin' | 'superadmin' }) {
  const { role } = useAppStore();
  const isAuthenticated = role && role !== 'guest';
  
  if (!isAuthenticated) return <Navigate to="/auth" />;
  
  if (requiredRole && role !== requiredRole && !(requiredRole === 'admin' && role === 'superadmin')) {
    if (role === 'helper') return <Navigate to="/helper" />;
    if (role === 'admin' || role === 'superadmin') return <Navigate to="/admin" />;
    return <Navigate to="/user" />;
  }
  return <>{children}</>;
}

function AppAnalytics() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
}

export default function App() {
  const { language } = useAppStore();

  useEffect(() => {
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Restore and maintain Supabase authentication session
  useEffect(() => {
    const syncSession = async (user: any, session: any) => {
      if (!user) return;
      try {
        // Query Profiles table using exact Phase 1 column name 'ID'
        const { data: profile } = await supabase
          .from('Profiles')
          .select('ID, Phone, Role')
          .eq('ID', user.id)
          .maybeSingle();

        const userRole = (profile?.Role || user.user_metadata?.role || 'user') as Role;
        const fullName = user.user_metadata?.full_name || '';
        const userPhone = profile?.Phone || user.phone || '';
        const cnicStatus = getCnicStatus(user);

        useAppStore.getState().login(userRole, fullName, userPhone, user, session);
        useAppStore.getState().setCnicStatus(cnicStatus);
      } catch (e) {
        console.warn('Session profile restoration warning:', e);
      }
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncSession(session.user, session);
      }
    });

    // Real-time auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        syncSession(session.user, session);
      } else if (event === 'SIGNED_OUT') {
        useAppStore.getState().logout();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <ToastContainer />
      <BrowserRouter>
      <AppAnalytics />
      <Routes>
        {/* Auth Flow */}
        <Route path="/auth" element={<MobileShell />}>
          <Route index element={<WelcomeScreen />} />
          <Route path="login" element={<LoginScreen />} />
          <Route path="signup" element={<LoginScreen />} />
          <Route path="cnic-verification" element={<CNICVerificationScreen />} />
        </Route>

        {/* User Flow */}
        <Route path="/user" element={
          <ProtectedRoute role="user">
            <MobileShell />
          </ProtectedRoute>
        }>
          <Route element={<><div className="md:hidden"><BottomNav /></div><OutletContainer /></>}>
             <Route index element={<UserHome />} />
             <Route path="bookings" element={<BookingsScreen />} />
             <Route path="messages" element={<MessagesScreen />} />
             <Route path="profile" element={<ProfileScreen />} />
             <Route path="profile/details" element={<PersonalDetailsScreen />} />
             <Route path="profile/payments" element={<SavedPaymentMethodsScreen />} />
             <Route path="profile/support" element={<HelpSupportScreen />} />
             <Route path="wallet" element={<WalletScreen />} />
             <Route path="services" element={<ServicesScreen />} />
          </Route>
          
          <Route path="become-helper" element={<BecomeHelperScreen />} />
          <Route path="post" element={<PostTaskScreen />} />
          <Route path="categories" element={<CategoriesScreen />} />
          <Route path="select-helper" element={<SelectHelperScreen />} />
          <Route path="tracking" element={<TrackingScreen />} />
          <Route path="payment" element={<PaymentRatingScreen />} />
        </Route>

        {/* Helper Flow */}
        <Route path="/helper" element={
          <ProtectedRoute role="helper">
            <MobileShell />
          </ProtectedRoute>
        }>
          <Route element={<><div className="md:hidden"><BottomNav /></div><OutletContainer /></>}>
             <Route index element={<HelperHome />} />
             <Route path="bookings" element={<BookingsScreen />} />
             <Route path="messages" element={<MessagesScreen />} />
             <Route path="profile" element={<ProfileScreen />} />
             <Route path="profile/details" element={<PersonalDetailsScreen />} />
             <Route path="profile/payments" element={<SavedPaymentMethodsScreen />} />
             <Route path="profile/support" element={<HelpSupportScreen />} />
             <Route path="wallet" element={<WalletScreen />} />
             <Route path="services" element={<ServicesScreen />} />
          </Route>
          
          <Route path="active-job" element={<ActiveJobScreen />} />
          {/* Existing helpers update services or re-submit CNIC after a rejection */}
          <Route path="become-helper" element={<BecomeHelperScreen />} />
        </Route>

        {/* Admin/SuperAdmin Flow */}
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminDashboard />} />
          <Route path="super" element={<SuperAdminDashboard />} />
          <Route path="jobs" element={<AdminJobsScreen />} />
          <Route path="disputes" element={<AdminDisputesScreen />} />
          <Route path="cnic" element={<AdminCNICQueue />} />
          <Route path="users" element={<UserManagementScreen />} />
          {/* Admins sign in with their real account; the login screen routes admin roles to /admin */}
          <Route path="login" element={<Navigate to="/auth/login" replace />} />
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}

function OutletContainer() {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return <Outlet />;
}
