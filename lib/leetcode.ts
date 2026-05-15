const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

async function fetchLeetCode<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Referer": "https://leetcode.com",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`LeetCode API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
}

export async function getUserProfile(username: string) {
  return fetchLeetCode<{
    matchedUser: {
      username: string;
      profile: {
        realName: string;
        userAvatar: string;
        ranking: number;
        aboutMe: string;
      };
      submitStats: {
        acSubmissionNum: { difficulty: string; count: number; submissions: number }[];
      };
    };
  }>(
    `query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile { realName userAvatar ranking aboutMe }
        submitStats {
          acSubmissionNum { difficulty count submissions }
        }
      }
    }`,
    { username }
  );
}

export async function getRecentSubmissions(username: string, limit = 20) {
  return fetchLeetCode<{
    recentAcSubmissionList: {
      id: string;
      title: string;
      titleSlug: string;
      timestamp: string;
      lang: string;
    }[];
  }>(
    `query getRecentSubmissions($username: String!, $limit: Int) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id title titleSlug timestamp lang
      }
    }`,
    { username, limit }
  );
}

export async function getQuestionDetail(slug: string) {
  return fetchLeetCode<{
    question: {
      difficulty: string;
      topicTags: { name: string }[];
    };
  }>(
    `query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        difficulty
        topicTags { name }
      }
    }`,
    { titleSlug: slug }
  );
}

export async function getContestHistory(username: string) {
  return fetchLeetCode<{
    userContestRanking: {
      rating: number;
      globalRanking: number;
      totalParticipants: number;
      topPercentage: number;
    } | null;
    userContestRankingHistory: {
      attended: boolean;
      rating: number;
      ranking: number;
      trendingDirection: string;
      finishTimeInSeconds: number;
      contest: { title: string; startTime: number };
    }[];
  }>(
    `query getContestHistory($username: String!) {
      userContestRanking(username: $username) {
        rating globalRanking totalParticipants topPercentage
      }
      userContestRankingHistory(username: $username) {
        attended rating ranking trendingDirection finishTimeInSeconds
        contest { title startTime }
      }
    }`,
    { username }
  );
}

export async function checkSubmission(username: string, slug: string) {
  return fetchLeetCode<{
    recentAcSubmissionList: { titleSlug: string }[];
  }>(
    `query checkSubmission($username: String!) {
      recentAcSubmissionList(username: $username, limit: 50) {
        titleSlug
      }
    }`,
    { username }
  ).then((data) =>
    data.recentAcSubmissionList.some((s) => s.titleSlug === slug)
  );
}
