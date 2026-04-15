import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// NextAuth route handler exports GET and POST for Discord authentication flow.
const authHandler = NextAuth(authOptions);
export const { GET, POST } = authHandler.handlers;
