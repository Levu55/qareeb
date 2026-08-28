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
        </Route>

        {/* Admin/SuperAdmin Flow */}
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminDashboard />} />
          <Route path="super" element={<SuperAdminDashboard />} />
          <Route path="jobs" element={<AdminJobsScreen />} />
          <Route path="disputes" element={<AdminDisputesScreen />} />
          <Route path="cnic" element={<AdminCNICQueue />} />
          <Route path="users" element={<UserManagementScreen />} />
          <Route path="login" element={
             <div className="flex h-full items-center justify-center -m-8">
               <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl">
                 <h2 className="text-2xl font-bold mb-6 text-center">Admin Access</h2>
                 <button onClick={() => { useAppStore.getState().login('admin', 'Admin User'); window.location.href='/admin'; }} className="w-full bg-gray-900 text-white p-3 rounded-xl mb-3">Login as Admin</button>
                 <button onClick={() => { useAppStore.getState().login('superadmin', 'Founder'); window.location.href='/admin/super'; }} className="w-full bg-brand-orange text-white p-3 rounded-xl">Login as Founder (Super Admin)</button>
               </div>
             </div>
          } />
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
