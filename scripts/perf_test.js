const http = require('http');

async function benchmark(name, path, headers = {}, concurrency = 10, total = 60) {
  const times = [];
  let completed = 0;
  const startTotal = process.hrtime.bigint();

  async function worker() {
    while (completed < total) {
      completed++;
      const start = process.hrtime.bigint();
      await new Promise((resolve) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: path,
          method: 'GET',
          headers: { 'Accept-Encoding': 'gzip, deflate', ...headers }
        }, (res) => {
          let size = 0;
          res.on('data', chunk => size += chunk.length);
          res.on('end', () => {
            const end = process.hrtime.bigint();
            times.push(Number(end - start) / 1e6);
            resolve();
          });
        });
        req.on('error', () => resolve());
        req.end();
      });
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const endTotal = process.hrtime.bigint();
  const totalDurationMs = Number(endTotal - startTotal) / 1e6;
  const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
  const min = Math.min(...times).toFixed(2);
  const max = Math.max(...times).toFixed(2);
  const rps = ((total / (totalDurationMs / 1000))).toFixed(0);

  console.log(`✅ ${name.padEnd(35)} | Moyenne: ${avg.padStart(6)}ms | Min: ${min.padStart(5)}ms | Max: ${max.padStart(6)}ms | Débit: ${rps} req/s`);
}

async function run() {
  console.log('========================================================================================');
  console.log('               RAPPORT OFFICIEL DES TESTS DE PERFORMANCE & DE CHARGE                    ');
  console.log('========================================================================================');
  await benchmark('Page d\'accueil HTML (/)', '/', {}, 10, 60);
  await benchmark('Page Connexion Admin (/admin/login)', '/admin/login', {}, 10, 60);
  await benchmark('Fichier CSS (/css/admin-cpanel.css)', '/css/admin-cpanel.css', {}, 10, 100);
  await benchmark('Fichier JS (/javascript/admin-cpanel.js)', '/javascript/admin-cpanel.js', {}, 10, 100);
  console.log('========================================================================================');
}
run();
