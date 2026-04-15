import DiscordProvider from 'next-auth/providers/discord';

const discordClientId = process.env.DISCORD_CLIENT_ID ?? '';
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET ?? '';

// NextAuth configuration for Discord OAuth.
// Keep callbacks minimal to store the provider access token for client-side usage.
export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
    }),
  ],
  callbacks: {
    async session(params: { session: any; token: any }) {
      const { session, token } = params;
      if (token?.accessToken) {
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
    async jwt(params: { token: any; user: any; account?: any }) {
      const { token, account } = params;
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};
