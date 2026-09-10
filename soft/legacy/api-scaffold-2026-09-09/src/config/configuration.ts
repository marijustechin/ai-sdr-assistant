export const appConfig = () => ({
  env: process.env['NODE_ENV'] ?? 'development',
  port: Number(process.env['PORT'] ?? 3003),

  db: {
    port: Number(process.env['DB_PORT']),
    user: process.env['DB_USER'],
    pass: process.env['DB_PASS'],
    name: process.env['DB_NAME'],
    url: process.env['DATABASE_URL'],
  },
});

export type AppConfig = ReturnType<typeof appConfig>;
