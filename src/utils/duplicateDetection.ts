import { Jamaah, DuplicateCheckResult } from '../types';

/**
 * Normalizes string: trim spaces, lowercase, remove punctuation
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes phone number to digits only
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
}

/**
 * Calculates Levenshtein Distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bLen][aLen];
}

/**
 * Checks similarity between target name and existing jamaah database
 */
export function checkDuplicateName(
  targetName: string,
  targetPhone: string,
  existingList: Jamaah[],
  currentJamaahId?: string
): DuplicateCheckResult {
  const normTarget = normalizeString(targetName);
  const normTargetPhone = normalizePhone(targetPhone || '');

  if (!normTarget) {
    return {
      isDuplicate: false,
      matchType: 'none',
      similarityPercentage: 0,
      reason: ''
    };
  }

  // 1. Phone number match if phone exists
  if (normTargetPhone && normTargetPhone.length >= 8) {
    const phoneMatch = existingList.find(
      (j) => j.id !== currentJamaahId && normalizePhone(j.phone || '') === normTargetPhone
    );
    if (phoneMatch) {
      return {
        isDuplicate: true,
        matchType: 'phone_match',
        similarityPercentage: 100,
        matchedWith: phoneMatch,
        reason: `Nomor telepon sama persis dengan ${phoneMatch.name} (${phoneMatch.id})`
      };
    }
  }

  // 2. Exact name match (case and extra space insensitive)
  const exactMatch = existingList.find(
    (j) => j.id !== currentJamaahId && normalizeString(j.name) === normTarget
  );
  if (exactMatch) {
    return {
      isDuplicate: true,
      matchType: 'exact',
      similarityPercentage: 100,
      matchedWith: exactMatch,
      reason: `Nama sama persis dengan ${exactMatch.name} (${exactMatch.id}) di ${exactMatch.rombongan_name || 'Rombongan'}`
    };
  }

  // 3. Similar name check (Levenshtein + Token containment e.g. "Putri Kamilah" vs "Putri K.")
  let highestSimilarity = 0;
  let candidateMatch: Jamaah | undefined = undefined;
  let candidateReason = '';

  const targetTokens = normTarget.split(' ').filter(Boolean);

  for (const item of existingList) {
    if (item.id === currentJamaahId) continue;
    const normItem = normalizeString(item.name);
    if (!normItem) continue;

    // Check token abbreviation (e.g. "Putri Kamilah" vs "Putri K")
    const itemTokens = normItem.split(' ').filter(Boolean);
    if (targetTokens.length >= 2 && itemTokens.length >= 2) {
      if (
        (targetTokens[0] === itemTokens[0] &&
          (targetTokens[1].startsWith(itemTokens[1]) || itemTokens[1].startsWith(targetTokens[1]))) ||
        (targetTokens[0].startsWith(itemTokens[0]) && targetTokens[1] === itemTokens[1])
      ) {
        return {
          isDuplicate: true,
          matchType: 'similar',
          similarityPercentage: 90,
          matchedWith: item,
          reason: `Nama sangat mirip (kemungkinan singkatan) dengan ${item.name} (${item.id})`
        };
      }
    }

    // Levenshtein metric
    const maxLen = Math.max(normTarget.length, normItem.length);
    const dist = levenshteinDistance(normTarget, normItem);
    const similarity = ((maxLen - dist) / maxLen) * 100;

    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      candidateMatch = item;
      candidateReason = `Tingkat kemiripan ${Math.round(similarity)}% dengan ${item.name} (${item.id})`;
    }
  }

  // If similarity >= 75% flag as similar
  if (highestSimilarity >= 75 && candidateMatch) {
    return {
      isDuplicate: true,
      matchType: 'similar',
      similarityPercentage: Math.round(highestSimilarity),
      matchedWith: candidateMatch,
      reason: candidateReason
    };
  }

  return {
    isDuplicate: false,
    matchType: 'none',
    similarityPercentage: Math.round(highestSimilarity),
    reason: 'Tidak terdeteksi duplikasi'
  };
}
