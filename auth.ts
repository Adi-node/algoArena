import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma as any),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});


//  Done ✅                                                                                                                                                               
                                                                                                                                                                      
//   Feature 1 — LeetCode Sync: Username verification + submission sync → UserSolved table                                                                                 
                                                                                                                                                                        
//   Feature 2 — Custom Contest Engine: Full seed (3163 questions), contest creation form, timed room with countdown, sync progress, end contest                           
                                                                                                                                                                        
//   Feature 3 — Upsolving Tracker: Refresh from contest history, manual contest slug entry (bypasses ranking delay), auto-creates new problems not in DB, mark done, live 
//   queue count on dashboard                                  
                                                                                                                                                                        
//   ---                                                       
//   Remaining ⬜
              
//   Feature 4 — AI Weakness Analysis (/dashboard/analysis — stub 404)
//   - Aggregate UserSolved by tag → call OpenRouter LLM → render Blind Spot Report                                                                                        
//   - Needs OPENROUTER_API_KEY in .env                                            
                                                                                                                                                                        
//   Feature 5 — Static Complexity Analyzer (/dashboard/complexity — stub 404)                                                                                             
//   - Paste code → LLM → Time/Space complexity + tips
//   - Same OPENROUTER_API_KEY                                                                                                                                             
                                                            
//   ---
//   Note for next session: LEETCODE_SESSION and LEETCODE_CSRFTOKEN in .env expire — refresh them from browser DevTools if the upsolving refresh starts failing again.
                                   
