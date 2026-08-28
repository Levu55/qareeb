const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const search = `    const handleOffline = () => addToast({ id: Date.now().toString(), type: 'error', message: 'You are offline. Some features may be unavailable.' });
    const handleOnline = () => addToast({ id: Date.now().toString(), type: 'success', message: 'Back online!' });`;

const replace = `    const handleOffline = () => addToast('You are offline. Some features may be unavailable.', 'error');
    const handleOnline = () => addToast('Back online!', 'success');`;

appContent = appContent.replace(search, replace);
fs.writeFileSync('src/App.tsx', appContent);
