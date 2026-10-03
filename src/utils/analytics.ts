export const trackEvent = (eventName: string, data: Record<string, any> = {}) => {
  // No analytics provider is connected yet; events are only logged during development
  if (import.meta.env.DEV) {
    console.log(`[Analytics Track]: ${eventName}`, data);
  }
};

export const trackPageView = (pageName: string) => {
  trackEvent('Page View', { page: pageName });
};
