import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',workers:1,retries:0,timeout:60000,
 use:{baseURL:'http://127.0.0.1:5199',headless:true,viewport:{width:1280,height:900}},
 webServer:[
  {command:'node tests/e2e-server.js',url:'http://127.0.0.1:3099/api/health',reuseExistingServer:false},
  {command:'API_TARGET=http://127.0.0.1:3099 npm exec vite -- --host 127.0.0.1 --port 5199 --strictPort',url:'http://127.0.0.1:5199',reuseExistingServer:false}
 ]
});
