export const trackEvent = (eventName: string, data: Record<string, any> = {}) => {
  // In a real application, this would send data to GA, Mixpanel, Segment, etc.
  console.log(`[Analytics Track]: ${eventName}`, data);
  
  // Optionally persist mock analytics to localStorage for demo purposes
  try {
    const events = JSON.parse(localStorage.getItem('qareeb_analytics_events') || '[]');
    events.push({
      event: eventName,
      data,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('qareeb_analytics_events', JSON.stringify(events));
  } catch (e) {
    console.error("Failed to track event locally", e);
  }
};

export const trackPageView = (pageName: string) => {
  trackEvent('Page View', { page: pageName });
};
