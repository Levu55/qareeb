import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('pageerror', error => {
    console.log('PAGE_ERROR_MESSAGE:', error.message);
    console.log('PAGE_ERROR_STACK:', error.stack);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE_ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:3000/auth');
  await new Promise(r => setTimeout(r, 1000));
  await page.goto('http://localhost:3000/auth/login');
  await new Promise(r => setTimeout(r, 1000));
  await page.goto('http://localhost:3000/user');
  await new Promise(r => setTimeout(r, 1000));
  await page.goto('http://localhost:3000/helper');
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
