const config = [
  {
    name: 'default',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'example',
    password: 'example',
    database: 'example',
    synchronize: true,
    timezone: 'Z',
    logging: ['query', 'error'],
    entities: ['src/entities/**/*.{js,ts}'],
    cli: {
      entitiesDir: 'entities',
    }
  },
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
    cli: {
      entitiesDir: 'entities',
    }
  },
  {
    name: 'sqlite',
    type: 'sqlite',
    database: 'example.db',
    synchronize: false,
    timezone: 'Z',
    logging: ['query', 'error'],
    entities: ['entities/**/*.{js,ts}'],
    cli: {
      entitiesDir: 'entities',
    }
  }
];

module.exports = config;
