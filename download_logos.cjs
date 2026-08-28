const https = require('https');
const fs = require('fs');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else if (res.statusCode === 301 || res.statusCode === 302) {
        download(res.headers.location, dest).then(resolve).catch(reject);
      } else {
        reject(new Error(`Status: ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function run() {
  try {
    await download('https://upload.wikimedia.org/wikipedia/commons/e/e3/Easypaisa_logo.svg', 'public/easypaisa.svg');
    console.log('Easypaisa downloaded');
  } catch (e) {
    console.log('Easypaisa failed:', e.message);
  }
  
  try {
    await download('https://upload.wikimedia.org/wikipedia/commons/a/a9/JazzCash_logo.svg', 'public/jazzcash.svg');
    console.log('JazzCash downloaded');
  } catch (e) {
    console.log('JazzCash failed:', e.message);
  }
}

run();
