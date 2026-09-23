export default {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'api::health.health.check',
      config: {
        auth: false,
      },
    },
  ],
};
