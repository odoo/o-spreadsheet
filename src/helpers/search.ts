/** Methods from Odoo Web Utils  */

/**
 * This function computes a score that represent the fact that the
 * string contains the pattern, or not
 *
 * - If the score is 0, the string does not contain the letters of the pattern in
 *   the correct order.
 * - if the score is > 0, it actually contains the letters.
 *
 * Better matches will get a higher score: consecutive letters are better,
 * and a match closer to the beginning of the string is also scored higher.
 */
export function fuzzyMatch(pattern: string, str: string) {
  pattern = pattern.toLocaleLowerCase();
  str = str.toLocaleLowerCase();

  let totalScore = 0;
  let currentScore = 0;
  let len = str.length;
  let patternIndex = 0;

  for (let i = 0; i < len; i++) {
    if (str[i] === pattern[patternIndex]) {
      patternIndex++;
      currentScore += 100 + currentScore - i / 200;
    } else {
      currentScore = 0;
    }
    totalScore = totalScore + currentScore;
  }

  return patternIndex === pattern.length ? totalScore : 0;
}

/**
 * Return a list of things that matches a pattern, ordered by their 'score' (
 * higher score first). An higher score means that the match is better. For
 * example, consecutive letters are considered a better match.
 */
export function fuzzyLookup<T>(pattern: string, list: T[], fn: (t: T) => string): T[] {
  const results: { score: number; elem: T }[] = [];
  list.forEach((data) => {
    const score = fuzzyMatch(pattern, fn(data));
    if (score > 0) {
      results.push({ score, elem: data });
    }
  });

  // we want better matches first
  results.sort((a, b) => b.score - a.score);

  return results.map((r) => r.elem);
}
