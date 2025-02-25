declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      REDIS_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {} 