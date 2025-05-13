import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { Trend, Counter } from 'k6/metrics';

// ————————————————————————————
// 1) Custom Metrics
// ————————————————————————————
let loginPageTime   = new Trend('login_page_time', true);
let loginPostTime   = new Trend('login_post_time', true);
let dashboardTime   = new Trend('dashboard_time', true);
let importTime      = new Trend('import_time', true);
let totalIteration  = new Trend('iteration_duration', true);
let errorsCount     = new Counter('errors_count');

// ————————————————————————————
// 2) Load Test Data (init stage)
// ————————————————————————————
const users = new SharedArray('users', () =>
  papaparse
    .parse(open('./users.csv'), { header: true, skipEmptyLines: true })
    .data
);

const items = new SharedArray('import items', () =>
  papaparse
    .parse(open('./import_data_updated.csv'), { header: true, skipEmptyLines: true })
    .data
);

// Preload binaries
const fileBins  = {};
const fileNames = {};
items.forEach(item => {
  // adjust to your CSV column name if perlu diganti
  let fp = item.filename || item.filePath;
  fileBins[fp]  = open(fp, 'b');
  fileNames[fp] = fp.split('/').pop();
});

// ————————————————————————————
// 3) Endpoints & Options
// ————————————————————————————
const LOGIN_PAGE = 'https://etwpad.id/login';
const LOGIN_POST = 'https://etwpad.id/login';
const DASHBOARD  = 'https://etwpad.id/dashboard';
const API_IMPORT = 'https://etwpad.id/eTWP/api/import';

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp-up to 50 VUs
    { duration: '3m', target: 50 },   // sustain
    { duration: '1m', target: 0 },    // ramp-down
  ],
  thresholds: {
    // Global thresholds
    'http_req_duration{type:all}': ['p(95)<5000'],     // 95% request <5s
    'errors_count': ['count<10'],                      // max 10 errors
    // Per-tag thresholds
    'http_req_duration{step:login}': ['p(95)<2000'],    // login steps <2s
    'http_req_duration{step:dashboard}': ['p(95)<3000'],// dashboard <3s
    'http_req_duration{step:import}': ['p(95)<15000'],  // import <15s
  },
};

// ————————————————————————————
// 4) Test Script
// ————————————————————————————
export default function () {
  let iterStart = Date.now();

  // ——— Step 1: GET login page ———
  let t0 = Date.now();
  let res = http.get(LOGIN_PAGE, {
    tags: { step: 'login', name: 'get_login_page' },
    redirects: 0,
  });
  loginPageTime.add(Date.now() - t0);
  check(res, {
    'get_login_page 200': (r) => r.status === 200,
  }) || errorsCount.add(1);

  // extract CSRF token
  let csrf = '';
  let m = res.body.match(/name="_token" value="([^"]+)"/);
  if (m) {
    csrf = m[1];
  } else {
    console.error('❌ CSRF token not found');
    errorsCount.add(1);
  }

  // ——— Step 2: POST login ———
  t0 = Date.now();
  res = http.post(
    LOGIN_POST,
    { _token: csrf, nrp: users[__VU % users.length].nrp, password: users[__VU % users.length].password },
    {
      jar: http.cookieJar(),
      redirects: 0,
      tags: { step: 'login', name: 'post_login' },
    }
  );
  loginPostTime.add(Date.now() - t0);
  check(res, {
    'post_login 302': (r) => r.status === 302,
  }) || errorsCount.add(1);

  // ——— Step 3: GET dashboard ———
  t0 = Date.now();
  res = http.get(DASHBOARD, {
    jar: http.cookieJar(),
    tags: { step: 'dashboard', name: 'get_dashboard' },
  });
  dashboardTime.add(Date.now() - t0);
  check(res, {
    'get_dashboard 200': (r) => r.status === 200,
  }) || errorsCount.add(1);

  // ——— Step 4: POST import file ———
  let item = items[__VU % items.length];
  let fp   = item.filename || item.filePath;
  let formData = {
    job:              'ImportGPP',
    rabbit:           'csv_process_queue',
    pns_atau_militer: item.pns_atau_militer,
    user_id:          item.user_id,
    nrp:              item.nrp,
    kd_ktm:           item.kd_ktm,
    kesatuan:         item.kesatuan,
    kd_subsatker:     item.kd_subsatker,
    file:             http.file(fileBins[fp], fileNames[fp]),
  };
  t0 = Date.now();
  res = http.post(API_IMPORT, formData, {
    jar: http.cookieJar(),
    tags: { step: 'import', name: 'post_import' },
  });
  importTime.add(Date.now() - t0);
  check(res, {
    'post_import 200': (r) => r.status === 200,
  }) || errorsCount.add(1);

  // record total iteration duration
  totalIteration.add(Date.now() - iterStart);

  // pacing
  sleep(1);
}
