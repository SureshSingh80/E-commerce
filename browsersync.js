const browserSync = require('browser-sync').create();

browserSync.init({
//   server:'./public',
  proxy: 'http://localhost:8080', // Your Node.js server
  files: ['public/**/*.*','views/**/*.*'], // Watch the 'public' folder for changes
  port: 4000,
  open: true // Set to 'true' to open the browser automatically
});
 