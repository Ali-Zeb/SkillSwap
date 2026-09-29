const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// llama-3.3-70b-versatile was deprecated for free/developer tiers on
// 2026-08-16 (Groq returns 404 model_not_found). openai/gpt-oss-120b is
// Groq's recommended production replacement. Override with GROQ_MODEL.
// Current list: https://console.groq.com/docs/models
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

/**
 * Builds a compact, privacy-conscious summary of a user's skills for
 * the AI prompt — only what's needed for matching, nothing else.
 */
const summarizeUser = (user) => ({
    id: user._id.toString(),
    name: user.fullName,
    headline: user.headline || '',
    teaches: user.skills
        .filter((s) => s.type === 'teach' && s.skillId)
        .map((s) => s.skillId.name),
    learns: user.skills
        .filter((s) => s.type === 'learn' && s.skillId)
        .map((s) => s.skillId.name)
});

/**
 * Local, deterministic fallback scoring used when the AI call fails or
 * no API key is configured. Counts direct skill-overlap matches so the
 * matching feature degrades gracefully instead of breaking outright.
 */
const localHeuristicRank = (currentUser, candidates) => {
    const myTeach = new Set(currentUser.skills.filter((s) => s.type === 'teach' && s.skillId).map((s) => s.skillId.name));
    const myLearn = new Set(currentUser.skills.filter((s) => s.type === 'learn' && s.skillId).map((s) => s.skillId.name));

    const scored = candidates.map((candidate) => {
        const theirTeach = candidate.skills.filter((s) => s.type === 'teach' && s.skillId).map((s) => s.skillId.name);
        const theirLearn = candidate.skills.filter((s) => s.type === 'learn' && s.skillId).map((s) => s.skillId.name);

        const theyTeachWhatIWant = theirTeach.filter((skill) => myLearn.has(skill)).length;
        const theyLearnWhatITeach = theirLearn.filter((skill) => myTeach.has(skill)).length;
        const overlapCount = theyTeachWhatIWant + theyLearnWhatITeach;

        // Simple 0-100 scale capped at a reasonable ceiling, just enough
        // to produce a sensible ordering without overstating precision.
        const compatibilityScore = Math.min(100, overlapCount * 35);

        return {
            user: candidate,
            compatibilityScore,
            reason: overlapCount > 0
                ? 'Skill overlap found based on what you teach and want to learn'
                : 'Potential match based on shared platform activity'
        };
    });

    return scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
};

/**
 * Ranks candidates by compatibility with the current user using a single
 * batched Groq API call. Falls back to localHeuristicRank if the API key
 * is missing, the request fails, or the response can't be parsed.
 */
const rankMatches = async (currentUser, candidates) => {
    if (!process.env.GROQ_API_KEY) {
        console.warn('GROQ_API_KEY not set — using local heuristic ranking');
        return localHeuristicRank(currentUser, candidates);
    }

    const me = summarizeUser(currentUser);
    const others = candidates.map(summarizeUser);

    const prompt = `You are a skill-exchange matchmaking assistant. Given one user and a list of candidate users, score each candidate's compatibility with the main user from 0-100 based on complementary skills (candidate teaches what the user wants to learn, and/or candidate wants to learn what the user teaches).

Main user: ${JSON.stringify(me)}

Candidates: ${JSON.stringify(others)}

Respond with ONLY a JSON array, no other text, in this exact format:
[{"id": "candidate_id", "compatibilityScore": 85, "reason": "short one-sentence reason"}]`;

    const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
    // gpt-oss models reason before answering; reasoning tokens count toward
    // the limit, so give them more room and keep reasoning effort low.
    const isReasoningModel = model.startsWith('openai/gpt-oss');

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: isReasoningModel ? 4000 : 1500,
                ...(isReasoningModel ? { reasoning_effort: 'low' } : {})
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        const raw = (response.data.choices?.[0]?.message?.content || '').trim();
        // Take just the JSON array, even if the model wrapped it in prose or fences.
        const start = raw.indexOf('[');
        const end   = raw.lastIndexOf(']');
        if (start === -1 || end <= start) {
            throw new Error(`Groq response contained no JSON array (model ${model})`);
        }
        const scores = JSON.parse(raw.slice(start, end + 1));

        const scoreMap = new Map(scores.map((s) => [s.id, s]));

        const ranked = candidates.map((candidate) => {
            const score = scoreMap.get(candidate._id.toString());
            return {
                user: candidate,
                compatibilityScore: score ? score.compatibilityScore : 0,
                reason: score ? score.reason : 'No specific overlap identified'
            };
        });

        return ranked.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    } catch (error) {
        // Log Groq's own error body (status, type, code, message) — never the
        // request, which carries the API key.
        const groqError = error.response?.data?.error;
        const detail = error.response
            ? `HTTP ${error.response.status} ${groqError?.code || groqError?.type || ''}: ${groqError?.message || JSON.stringify(error.response.data).slice(0, 300)}`
            : error.message;
        console.error(`Groq AI ranking failed (model ${model}), using local fallback — ${detail}`);
        return localHeuristicRank(currentUser, candidates);
    }
};

module.exports = { rankMatches };