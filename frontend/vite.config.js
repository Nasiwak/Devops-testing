// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import tailwindcss from '@tailwindcss/vite';
// import fs from "fs";

// export default defineConfig({
//   server: {
//     host: "192.168.0.121", // ✅ Use your local IP
//     port: 5173, // ✅ Keep your desired port
//     https: {
//       key: fs.readFileSync("C:/Users/kusha/Working/Nasiwak Messenger/nginx-1.26.3/key.pem"), // ✅ Load private key
//       cert: fs.readFileSync("C:/Users/kusha/Working/Nasiwak Messenger/nginx-1.26.3/cert.pem"), // ✅ Load SSL certificate
//       rejectUnauthorized: false, // ✅ Ignore SSL errors
//     }
//   },
//   proxy: {
//     "/api": {
//       target: "https://192.168.0.121:8000",
//       changeOrigin: true,
//       secure: true, // ✅ If self-signed certificates cause issues
//       rewrite: (path) => path.replace(/^\/api/, "/api"), // ✅ Fix request forwarding
//     }
//   },
//   plugins: [react(), tailwindcss()],
// });


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
