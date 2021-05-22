const config = [
  {
    name: 'default',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'example',
    password: 'example',
    database: 'example',
    synchronize: false,
    timezone: 'Z',
    logging: ['query', 'error'],
    entities: ['entities/**/*.{js,ts}'],
    migrations: ['migrations/*.{js,ts}'],
    subscribers: ['subscribers/**/*.{js,ts}'],
    seeds: ['migrations/seeds/**/*.{js,ts}'],
    factories: ['migrations/factories/**/*.{js,ts}'],
    cli: {
      entitiesDir: 'entities',
      migrationsDir: 'migrations',
      subscribersDir: 'subscribers'
    }
  }
];

module.exports = config;
