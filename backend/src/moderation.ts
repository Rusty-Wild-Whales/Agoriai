const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "|": "i",
  "0": "o",
  "5": "s",
  "$": "s",
  "7": "t",
  "2": "z",
};

const INVISIBLE_CHAR_PATTERN = /[\u200b-\u200f\u2060\ufeff]/g;

const BLOCKED_WORDS = [
  "asshole",
  "bastard",
  "bitch",
  "bullshit",
  "crap",
  "cunt",
  "damn",
  "dick",
  "dumbass",
  "faggot",
  "fuck",
  "motherfucker",
  "nigga",
  "nigger",
  "pedo",
  "pedophile",
  "porn",
  "pussy",
  "rapist",
  "retard",
  "shit",
  "slut",
  "whore",
  "cock",
  "cum",
  "fucking",
  "fucked",
  "fucker",
  "fuk",
  "fk",
  "nazi",
  "hitler",
  "incest",
  "anal",
  "blowjob",
  "dildo",
  "sex",
] as const;

const BLOCKED_PHRASES = [
  /\bkill\s+yourself\b/i,
  /\bgo\s+die\b/i,
  /\bkys\b/i,
  /\bhang\s+yourself\b/i,
  /\brape\s+yourself\b/i,
  /\bheil\s+hitler\b/i,
] as const;

export type ModerationMatch = {
  blocked: boolean;
  matches: string[];
};

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(INVISIBLE_CHAR_PATTERN, "")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split("")
    .map((char) => LEET_MAP[char] ?? char)
    .join("")
    .replace(/[_~`*^]+/g, "")
    .replace(/[^\da-z\s]/g, " ");
}

function collapseRepeatingChars(value: string) {
  return value.replace(/([a-z])\1{2,}/g, "$1$1");
}

function isWithinOneEditDistance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (a.length > b.length) {
      i += 1;
    } else if (b.length > a.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < a.length || j < b.length) {
    edits += 1;
  }

  return edits <= 1;
}

export function detectInappropriateLanguage(value: string): ModerationMatch {
  const normalized = collapseRepeatingChars(normalizeText(value)).replace(/\s+/g, " ").trim();
  const matches = new Set<string>();

  for (const pattern of BLOCKED_PHRASES) {
    if (pattern.test(normalized)) {
      matches.add("harmful_phrase");
    }
  }

  const tokens = normalized.split(/[^a-z]+/g).filter((token) => token.length > 1);
  const compactTokens = tokens.map((token) => token.replace(/(.)\1+/g, "$1"));

  const joinedWithNoGaps = tokens.join("");
  const initialismJoined = tokens
    .filter((token) => token.length === 1)
    .join("");

  for (const token of tokens) {
    for (const blockedWord of BLOCKED_WORDS) {
      if (token === blockedWord) {
        matches.add(blockedWord);
        continue;
      }

      if (blockedWord.length >= 5 && isWithinOneEditDistance(token, blockedWord)) {
        matches.add(blockedWord);
      }
    }
  }

  for (const token of compactTokens) {
    for (const blockedWord of BLOCKED_WORDS) {
      if (blockedWord.length >= 4 && token === blockedWord) {
        matches.add(blockedWord);
      }
    }
  }

  const alphaJoined = normalized.replace(/[^a-z]/g, "");
  for (const blockedWord of BLOCKED_WORDS) {
    if (blockedWord.length >= 4 && alphaJoined.includes(blockedWord)) {
      matches.add(blockedWord);
    }
    if (blockedWord.length >= 4 && joinedWithNoGaps.includes(blockedWord)) {
      matches.add(blockedWord);
    }
    if (initialismJoined.includes(blockedWord)) {
      matches.add(blockedWord);
    }
  }

  return {
    blocked: matches.size > 0,
    matches: [...matches],
  };
}

export function findModerationViolation(fields: Array<{ label: string; value: string }>) {
  for (const field of fields) {
    const result = detectInappropriateLanguage(field.value);
    if (result.blocked) {
      return {
        field: field.label,
        matches: result.matches,
      };
    }
  }

  return null;
}
