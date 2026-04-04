import NextAuth from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

const ALLOWED_USERS = ['pixelpowder', 'islandcontroller'];

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      return ALLOWED_USERS.includes(profile?.login?.toLowerCase());
    },
    async session({ session, token }) {
      session.user.username = token.username;
      return session;
    },
    async jwt({ token, profile }) {
      if (profile) token.username = profile.login;
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});

export { handler as GET, handler as POST };
