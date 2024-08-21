module.exports = {
  apps: [
    {
      name: "my-custom-app",
      script: "Main.js",
      watch: true,
      max_restarts: 1000, // Maximum number of restarts
      restart_delay: 5000, // Delay between restarts in milliseconds
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
