import { unstable_cache } from "next/cache";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const LEETCODE_FETCH_TIMEOUT_MS = 8000;

/**
 * Cache tag scoped to a single Algo Arena user. Used by `getContestHistory` /
 * `getUserCalendar` so two AA users that happen to share the same LeetCode
 * handle don't collide on the cache (and so revalidation is per-owner).
 */
export function leetcodeUserTag(userId: string) {
  return `leetcode:user:${userId}`;
}

async function fetchLeetCode<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Referer": "https://leetcode.com",
  };
  if (process.env.LEETCODE_SESSION) {
    const csrfToken = process.env.LEETCODE_CSRFTOKEN ?? "";
    headers["Cookie"] = `LEETCODE_SESSION=${process.env.LEETCODE_SESSION}; csrftoken=${csrfToken}`;
    if (csrfToken) headers["x-csrftoken"] = csrfToken;
  }
  const res = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(LEETCODE_FETCH_TIMEOUT_MS),
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
      questionId: string;
      title: string;
      difficulty: string;
      topicTags: { name: string }[];
    };
  }>(
    `query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        difficulty
        topicTags { name }
      }
    }`,
    { titleSlug: slug }
  );
}

type ContestHistory = {
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
    contest: { title: string; startTime: number };
  }[];
};

function _getContestHistory(username: string) {
  return fetchLeetCode<ContestHistory>(
    `query getContestHistory($username: String!) {
      userContestRanking(username: $username) {
        rating globalRanking totalParticipants topPercentage
      }
      userContestRankingHistory(username: $username) {
        attended rating ranking
        contest { title startTime }
      }
    }`,
    { username }
  );
}

export function getContestHistory(username: string, ownerUserId: string): Promise<ContestHistory> {
  return unstable_cache(
    () => _getContestHistory(username),
    ["leetcode:contestHistory", ownerUserId, username],
    { revalidate: 300, tags: [leetcodeUserTag(ownerUserId)] },
  )();
}

type UserCalendar = {
  matchedUser: {
    userCalendar: {
      activeYears: number[];
      streak: number;
      totalActiveDays: number;
      submissionCalendar: string;
    };
  } | null;
};

function _getUserCalendar(username: string, year?: number) {
  return fetchLeetCode<UserCalendar>(
    `query getUserCalendar($username: String!, $year: Int) {
      matchedUser(username: $username) {
        userCalendar(year: $year) {
          activeYears streak totalActiveDays submissionCalendar
        }
      }
    }`,
    { username, year }
  );
}

export function getUserCalendar(username: string, ownerUserId: string, year?: number): Promise<UserCalendar> {
  return unstable_cache(
    () => _getUserCalendar(username, year),
    ["leetcode:userCalendar", ownerUserId, username, String(year ?? "")],
    { revalidate: 300, tags: [leetcodeUserTag(ownerUserId)] },
  )();
}

export async function getContestRankingHistory(username: string) {
  return fetchLeetCode<{
    userContestRankingHistory: {
      attended: boolean;
      problemsSolved: number;
      totalProblems: number;
      contest: { title: string; startTime: number };
    }[];
  }>(
    `query getContestRankingHistory($username: String!) {
      userContestRankingHistory(username: $username) {
        attended
        problemsSolved
        totalProblems
        contest { title startTime }
      }
    }`,
    { username }
  );
}

export async function fetchAllSolvedSlugs(leetcodeSession: string): Promise<string[]> {
  const res = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com",
      Cookie: `LEETCODE_SESSION=${leetcodeSession}`,
    },
    body: JSON.stringify({
      query: `query userProgressQuestionList($filters: UserProgressQuestionListInput) {
        userProgressQuestionList(filters: $filters) {
          totalNum
          questions { titleSlug questionStatus }
        }
      }`,
      variables: { filters: { skip: 0, limit: 10000 } },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`LeetCode API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  const list = json.data?.userProgressQuestionList;
  if (!list) throw new Error("Session expired or invalid. Get a fresh LEETCODE_SESSION cookie.");
  return (list.questions as { titleSlug: string; questionStatus: string }[])
    .filter((q) => q.questionStatus === "SOLVED")
    .map((q) => q.titleSlug);
}

export async function getProblemList(skip = 0, limit = 100) {
  return fetchLeetCode<{
    questionList: {
      total: number;
      questions: {
        questionFrontendId: string;
        title: string;
        titleSlug: string;
        difficulty: string;
        topicTags: { name: string }[];
        isPaidOnly: boolean;
      }[];
    };
  }>(
    `query getProblemList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
        total: totalNum
        questions: data {
          questionFrontendId
          title
          titleSlug
          difficulty
          topicTags { name }
          isPaidOnly
        }
      }
    }`,
    { categorySlug: "", limit, skip, filters: {} }
  );
}

export async function getContestDetails(titleSlug: string) {
  const data = await fetchLeetCode<{
    contest: {
      title: string;
      startTime: number;
      questions: { title: string; titleSlug: string; questionId: string }[];
    } | null;
  }>(
    `query getContest($titleSlug: String!) {
      contest(titleSlug: $titleSlug) {
        title
        startTime
        questions { title titleSlug questionId }
      }
    }`,
    { titleSlug }
  );
  if (!data.contest) throw new Error("Contest not found");
  return {
    contest: { title: data.contest.title, startTime: data.contest.startTime },
    questions: data.contest.questions.map((q) => ({
      title: q.title,
      title_slug: q.titleSlug,
      question_id: q.questionId,
    })),
  };
}

/**
 * @deprecated Issues a full recentAcSubmissionList GraphQL request for a single
 * slug lookup. When checking multiple slugs, call `getRecentSubmissions` once
 * and build a `Set<string>` of `titleSlug` values locally.
 */
export async function checkSubmission(username: string, slug: string) {
  const data = await getRecentSubmissions(username, 50);
  return data.recentAcSubmissionList.some((s) => s.titleSlug === slug);
}
