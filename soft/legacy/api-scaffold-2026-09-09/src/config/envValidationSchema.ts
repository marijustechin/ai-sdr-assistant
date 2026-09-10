import Joi, { type ObjectSchema } from 'joi';

interface EnvVars {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
}

export const envValidationSchema: ObjectSchema<EnvVars> = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  PORT: Joi.number().integer().positive().default(3003),

  // DB
  DB_USER: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_PASS: Joi.string().required(),
  DB_PORT: Joi.number().integer().positive().required(),
  DATABASE_URL: Joi.string().required(),
});
