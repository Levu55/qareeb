const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const searchAnalytics = `function AppAnalytics() {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}`;

const replaceAnalytics = `function AppAnalytics() {
  const location = useLocation();
  const addToast = useAppStore(state => state.addToast);
  
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleOffline = () => addToast({ id: Date.now().toString(), type: 'error', message: 'You are offline. Some features may be unavailable.' });
    const handleOnline = () => addToast({ id: Date.now().toString(), type: 'success', message: 'Back online!' });
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    if (!navigator.onLine) {
      handleOffline();
    }
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    }
  }, []);

  return null;
}`;

appContent = appContent.replace(searchAnalytics, replaceAnalytics);
fs.writeFileSync('src/App.tsx', appContent);
