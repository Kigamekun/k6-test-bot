import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// 1) Load credentials
const users = new SharedArray('users', () =>
  papaparse
    .parse(open('./users.csv'), { header: true, skipEmptyLines: true })
    .data
);

// 2) Load import‐items WITHOUT binary
const items = new SharedArray('import items', () =>
  papaparse
    .parse(open('./import_data_updated.csv'), { header: true, skipEmptyLines: true })
    .data
);

// 3) Preload all file binaries into a plain JS map
//    (ini di init stage, tidak masuk SharedArray)
const fileBins = {};
const fileNames = {};
items.forEach((item) => {
  // open() masih di init stage → OK
  fileBins[item.filePath] = open(item.filePath, 'b');
  fileNames[item.filePath] = item.filePath.split('/').pop();
});

// 4) Endpoints
const LOGIN_PAGE = 'https://etwpad.id/login';
const LOGIN_POST = 'https://etwpad.id/login';
const DASHBOARD  = 'https://etwpad.id/dashboard';
const API_IMPORT = 'https://etwpad.id/eTWP/api/import';
const API_CEK    = 'https://etwpad.id/eTWP/api/cek-rekening';



export let options = {
  stages: [
    { duration: '1m', target: 100 },
    // { duration: '1m', target: 500 },
    // { duration: '1m', target: 1000 },
    // { duration: '1m', target: 1500 },
    // { duration: '1m', target: 2000 },
    // { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<500'],
  },
};
export default function () {
  const jar  = http.cookieJar();
  const user = users[__VU % users.length];
  const nrp  = user.nrp;
  const pwd  = user.password;

  // — 1) GET login page
  let res = http.get(LOGIN_PAGE, { jar, redirects: 0 });
  check(res, { 'login page 200': (r) => r.status === 200 });

  // extract CSRF token
  const m = res.body.match(/name="_token" value="([^"]+)"/);
  const csrf = m ? m[1] : '';

  // — 2) POST login
  res = http.post(
    LOGIN_POST,
    { _token: csrf, nrp, password: pwd },
    { jar, redirects: 0 }
  );
  check(res, {
    'login→302': (r) => r.status === 302,
    'session cookie set': () =>
      !!jar.cookiesForURL('https://etwpad.id')['etwpad_session'],
  });
  if (res.status !== 302) return;

  // — 3) GET dashboard
  res = http.get(DASHBOARD, { jar });
  check(res, { 'dashboard 200': (r) => r.status === 200 });

  // — 4) POST import file via API
  const item = items[__VU % items.length];
  const formData = {
    job:              'ImportGPP',
    rabbit:           'csv_process_queue',
    pns_atau_militer: item.pns_atau_militer,
    user_id:          item.user_id,
    nrp:              item.nrp,
    kd_ktm:           item.kd_ktm,
    kesatuan:         item.kesatuan,
    kd_subsatker:     item.kd_subsatker,
    // ambil binary & nama dari map, bukan dari SharedArray
    file:             http.file(fileBins[item.filePath], fileNames[item.filePath]),
  };
  
  res = http.post(API_IMPORT, formData, {  jar });

  if (res.status !== 200) {
    console.error(`❌ Import failed: HTTP ${res.status}\nResponse body: ${res.body}`);
  } else {
    console.log(`✅ Import OK: HTTP ${res.status}`);
  }
  check(res, {
    'import 200':      (r) => r.status === 200,
  });
  if (res.status !== 200) return;

  // — 5) POST cek rekening
  // res = http.post(API_CEK, null, { headers, jar });
  // check(res, {
  //   'cek rekening 200':  (r) => r.status === 200,
  //   'cek rekening done': (r) => r.json('success') === true,
  // });
}
