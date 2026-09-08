import mongoose from 'mongoose';

export const connectDB = async (retries = 5, delayMs = 3000): Promise<void> => {
  const connUri = process.env.MONGODB_URI;
  if (!connUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(connUri, {
        serverSelectionTimeoutMS: 20000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      });

      console.log(`[MongoDB Atlas] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
      return;
    } catch (error: any) {
      console.warn(`[MongoDB Atlas Connection Attempt ${attempt}/${retries} notice]: ${error.message}`);
      if (attempt < retries) {
        console.log(`[MongoDB Atlas] Retrying connection in ${delayMs / 1000}s...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error('[MongoDB Atlas Critical] All connection attempts failed.');
      }
    }
  }
};
