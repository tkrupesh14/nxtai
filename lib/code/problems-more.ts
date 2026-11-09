import "server-only"

// Krpex Code v2, Phase 2 (plan.md "Krpex Code v2"): problems 71–150, the rest of the "Krpex 150". Same rules as
// problems.ts — every reference solution runs against its tests in both languages (tests/unit/code-problems.test.ts),
// and migration 030 adds the rows. These also carry a short editorial, shown with the official solution.

import type { Problem, TestCase } from "@/lib/code/problems"

const T = (expected: unknown, ...args: unknown[]): TestCase => ({ args, expected })

/** Code written indented inside this file, with the common indent removed. Raw, so "\n" stays as typed. */
function code(strings: TemplateStringsArray) {
  const lines = strings.raw.join("").replace(/^\n/, "").replace(/\n\s*$/, "").split("\n")
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length))
  return lines.map((l) => l.slice(indent)).join("\n")
}

const range = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i))

export const MORE_PROBLEMS: Problem[] = [
  // ---------- Basics ----------
  {
    slug: "absolute-difference", title: "Absolute difference", topic: "Basics", difficulty: "easy",
    statement: "Return how far apart `a` and `b` are: the difference between them, never negative.",
    fn: "abs_diff", params: ["a", "b"], samples: 2,
    tests: [T(5, 8, 3), T(5, 3, 8), T(0, 4, 4), T(10, -4, 6), T(7, -10, -3), T(2000000, 1000000, -1000000)],
    solution: {
      python: code`
        def abs_diff(a, b):
            return abs(a - b)`,
      javascript: code`
        function absDiff(a, b) {
          return Math.abs(a - b)
        }`,
    },
    editorial: { idea: "Subtract, then drop the sign with the built-in absolute value.", time: "O(1)", space: "O(1)" },
  },
  {
    slug: "minutes-to-clock", title: "Minutes to clock time", topic: "Basics", difficulty: "easy",
    statement: "Turn a number of `minutes` into the text `H:MM` — hours without a leading zero, then minutes as exactly two digits. 125 minutes is `\"2:05\"`.",
    fn: "to_clock", params: ["minutes"], samples: 2,
    tests: [T("2:05", 125), T("0:00", 0), T("0:59", 59), T("1:00", 60), T("23:59", 1439), T("10:00", 600), T("27:30", 1650)],
    solution: {
      python: code`
        def to_clock(minutes):
            return f"{minutes // 60}:{minutes % 60:02d}"`,
      javascript: code`
        function toClock(minutes) {
          return Math.floor(minutes / 60) + ":" + String(minutes % 60).padStart(2, "0")
        }`,
    },
    editorial: { idea: "Whole hours are minutes ÷ 60 rounded down; the rest is minutes % 60, padded to two digits.", time: "O(1)", space: "O(1)" },
  },
  {
    slug: "triangle-type", title: "Triangle type", topic: "Basics", difficulty: "easy",
    statement:
      "Given three side lengths, return `\"equilateral\"` (all equal), `\"isosceles\"` (exactly two equal), `\"scalene\"` (none equal) or `\"invalid\"`.\n\nThe sides can't make a triangle if any side is 0 or less, or if the two shorter sides together are not longer than the longest one.",
    fn: "triangle_type", params: ["a", "b", "c"], samples: 3,
    tests: [T("equilateral", 3, 3, 3), T("isosceles", 3, 3, 5), T("scalene", 3, 4, 5), T("invalid", 1, 2, 3), T("invalid", 0, 1, 1), T("isosceles", 5, 3, 5), T("invalid", 2, 2, 5), T("scalene", 7, 10, 5)],
    solution: {
      python: code`
        def triangle_type(a, b, c):
            x, y, z = sorted([a, b, c])
            if x <= 0 or x + y <= z:
                return "invalid"
            if x == z:
                return "equilateral"
            if x == y or y == z:
                return "isosceles"
            return "scalene"`,
      javascript: code`
        function triangleType(a, b, c) {
          const [x, y, z] = [a, b, c].sort((p, q) => p - q)
          if (x <= 0 || x + y <= z) return "invalid"
          if (x === z) return "equilateral"
          if (x === y || y === z) return "isosceles"
          return "scalene"
        }`,
    },
    editorial: { idea: "Sort the sides first: then the validity check is one comparison, and equal sides sit next to each other.", time: "O(1)", space: "O(1)" },
  },
  {
    slug: "times-table", title: "Times table", topic: "Basics", difficulty: "easy",
    statement: "Return the times table of `n` as a list: `n × 1`, `n × 2`, … up to `n × 10`.",
    fn: "times_table", params: ["n"], samples: 1,
    tests: [T(range(10, (i) => 3 * (i + 1)), 3), T(range(10, () => 0), 0), T(range(10, (i) => -2 * (i + 1)), -2), T(range(10, (i) => i + 1), 1), T(range(10, (i) => 12 * (i + 1)), 12)],
    solution: {
      python: code`
        def times_table(n):
            return [n * i for i in range(1, 11)]`,
      javascript: code`
        function timesTable(n) {
          const out = []
          for (let i = 1; i <= 10; i++) out.push(n * i)
          return out
        }`,
    },
    editorial: { idea: "Loop i from 1 to 10 and collect n × i.", time: "O(1) — always 10 items", space: "O(1)" },
  },
  {
    slug: "electricity-bill", title: "Electricity bill", topic: "Basics", difficulty: "easy",
    statement: "A power company charges in slabs: the first 100 units cost ₹5 each, units 101–200 cost ₹7 each, and every unit above 200 costs ₹10. Return the bill in rupees for `units`.",
    fn: "bill", params: ["units"], samples: 3,
    tests: [T(250, 50), T(850, 150), T(1700, 250), T(500, 100), T(1200, 200), T(0, 0), T(507, 101), T(1210, 201)],
    solution: {
      python: code`
        def bill(units):
            total = min(units, 100) * 5
            if units > 100:
                total += (min(units, 200) - 100) * 7
            if units > 200:
                total += (units - 200) * 10
            return total`,
      javascript: code`
        function bill(units) {
          let total = Math.min(units, 100) * 5
          if (units > 100) total += (Math.min(units, 200) - 100) * 7
          if (units > 200) total += (units - 200) * 10
          return total
        }`,
    },
    editorial: { idea: "Charge each slab separately: the part of the units that falls inside it, times its rate.", time: "O(1)", space: "O(1)" },
  },

  // ---------- Strings ----------
  {
    slug: "is-palindrome", title: "Is it a palindrome?", topic: "Strings", difficulty: "easy",
    statement: "Return `True` (JavaScript: `true`) if `s` reads the same forwards and backwards, ignoring upper and lower case. Every other character counts, spaces included.",
    fn: "is_palindrome", params: ["s"], samples: 2,
    tests: [T(true, "Level"), T(false, "abc"), T(true, ""), T(true, "a"), T(true, "Abba"), T(false, "ab"), T(false, "nurses run"), T(true, "Madam")],
    solution: {
      python: code`
        def is_palindrome(s):
            s = s.lower()
            return s == s[::-1]`,
      javascript: code`
        function isPalindrome(s) {
          s = s.toLowerCase()
          return s === [...s].reverse().join("")
        }`,
    },
    editorial: { idea: "Lower-case once, then compare the string with its reverse — or walk two pointers in from both ends.", time: "O(n)", space: "O(n) for the reversed copy (O(1) with two pointers)" },
  },
  {
    slug: "acronym", title: "Make an acronym", topic: "Strings", difficulty: "easy",
    statement: "Return the acronym of `phrase`: the first letter of every word, in capitals. Words are separated by one or more spaces.",
    fn: "acronym", params: ["phrase"], samples: 2,
    tests: [T("PNG", "Portable network graphics"), T("ASAP", "as soon as possible"), T("HW", "  hello   world "), T("", ""), T("I", "india"), T("RAM", "random Access memory")],
    solution: {
      python: code`
        def acronym(phrase):
            return "".join(w[0].upper() for w in phrase.split())`,
      javascript: code`
        function acronym(phrase) {
          return phrase.split(" ").filter((w) => w).map((w) => w[0].toUpperCase()).join("")
        }`,
    },
    editorial: { idea: "Split into words (skipping empty pieces from extra spaces) and join their first letters, upper-cased.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "reverse-words", title: "Reverse the words", topic: "Strings", difficulty: "easy",
    statement: "Return the words of `s` in reverse order, joined by single spaces. Words in `s` may be separated by several spaces, with extra spaces at the ends.",
    fn: "reverse_words", params: ["s"], samples: 2,
    tests: [T("blue is sky the", "the sky is blue"), T("world hello", "  hello world  "), T("a", "a"), T("", ""), T("c b a", "a  b   c"), T("", "   ")],
    solution: {
      python: code`
        def reverse_words(s):
            return " ".join(reversed(s.split()))`,
      javascript: code`
        function reverseWords(s) {
          return s.split(" ").filter((w) => w).reverse().join(" ")
        }`,
    },
    editorial: { idea: "Split on spaces, drop the empty pieces, reverse the list and join with one space.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "remove-vowels", title: "Remove the vowels", topic: "Strings", difficulty: "easy",
    statement: "Return `s` with every vowel (a, e, i, o, u — upper or lower case) removed.",
    fn: "remove_vowels", params: ["s"], samples: 2,
    tests: [T("Hll Wrld", "Hello World"), T("", "AEIOU"), T("rhythm", "rhythm"), T("", ""), T("Bnglr", "Bengaluru"), T("xyz", "xyz")],
    solution: {
      python: code`
        def remove_vowels(s):
            return "".join(ch for ch in s if ch.lower() not in "aeiou")`,
      javascript: code`
        function removeVowels(s) {
          return [...s].filter((ch) => !"aeiou".includes(ch.toLowerCase())).join("")
        }`,
    },
    editorial: { idea: "Keep each character whose lower-case form isn't a vowel.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "pangram", title: "Pangram", topic: "Strings", difficulty: "easy",
    statement: "A pangram uses every letter of the English alphabet at least once. Return `True` (JavaScript: `true`) if `s` is one, ignoring case.",
    fn: "is_pangram", params: ["s"], samples: 2,
    tests: [T(true, "The quick brown fox jumps over the lazy dog"), T(false, "Hello"), T(false, ""), T(true, "abcdefghijklmnopqrstuvwxyz"), T(false, "ABCDEFGHIJKLMNOPQRSTUVWXY"), T(true, "Pack my box with five dozen liquor jugs")],
    solution: {
      python: code`
        def is_pangram(s):
            return set("abcdefghijklmnopqrstuvwxyz") <= set(s.lower())`,
      javascript: code`
        function isPangram(s) {
          const seen = new Set(s.toLowerCase())
          return [..."abcdefghijklmnopqrstuvwxyz"].every((ch) => seen.has(ch))
        }`,
    },
    editorial: { idea: "Put the lower-cased characters in a set and check all 26 letters are in it.", time: "O(n)", space: "O(1) — at most 26 letters matter" },
  },
  {
    slug: "longest-common-prefix", title: "Longest common prefix", topic: "Strings", difficulty: "medium",
    statement: "Return the longest text that every word in `words` starts with. If there is none (or the list is empty), return `\"\"`.",
    fn: "common_prefix", params: ["words"], samples: 2,
    tests: [T("fl", ["flower", "flow", "flight"]), T("", ["dog", "racecar", "car"]), T("a", ["a"]), T("", []), T("ab", ["ab", "ab"]), T("ab", ["abc", "abd", "ab"]), T("", ["", "abc"])],
    solution: {
      python: code`
        def common_prefix(words):
            if not words:
                return ""
            prefix = words[0]
            for w in words[1:]:
                while not w.startswith(prefix):
                    prefix = prefix[:-1]
            return prefix`,
      javascript: code`
        function commonPrefix(words) {
          if (words.length === 0) return ""
          let prefix = words[0]
          for (const w of words.slice(1)) while (!w.startsWith(prefix)) prefix = prefix.slice(0, -1)
          return prefix
        }`,
    },
    editorial: { idea: "Start with the first word as the prefix and shorten it until each next word starts with it.", time: "O(total letters)", space: "O(1) beyond the answer" },
  },
  {
    slug: "is-subsequence", title: "Is subsequence", topic: "Strings", difficulty: "medium",
    statement: "Return `True` (JavaScript: `true`) if you can get `s` by deleting some characters of `t` (possibly none) without changing the order of the rest.",
    fn: "is_subsequence", params: ["s", "t"], samples: 2,
    tests: [T(true, "abc", "ahbgdc"), T(false, "axc", "ahbgdc"), T(true, "", "abc"), T(false, "abc", ""), T(false, "aaa", "aa"), T(true, "ace", "abcde")],
    solution: {
      python: code`
        def is_subsequence(s, t):
            i = 0
            for ch in t:
                if i < len(s) and s[i] == ch:
                    i += 1
            return i == len(s)`,
      javascript: code`
        function isSubsequence(s, t) {
          let i = 0
          for (const ch of t) if (i < s.length && s[i] === ch) i++
          return i === s.length
        }`,
    },
    editorial: { idea: "Walk through t once, moving a pointer in s forward each time the letters match. s is a subsequence if the pointer reaches its end.", time: "O(len t)", space: "O(1)" },
  },
  {
    slug: "run-length-decode", title: "Run-length decode", topic: "Strings", difficulty: "medium",
    statement: "`s` is made of pairs: a count (one or more digits) followed by one letter, like `\"3a2b\"`. Return the decoded text, where each letter is repeated count times: `\"aaabb\"`.",
    fn: "decode_runs", params: ["s"], samples: 2,
    tests: [T("aaabbc", "3a2b1c"), T("x".repeat(12), "12x"), T("", ""), T("ab", "1a1b"), T("z".repeat(10) + "yy", "10z2y"), T("q", "1q")],
    solution: {
      python: code`
        def decode_runs(s):
            out, count = [], ""
            for ch in s:
                if ch.isdigit():
                    count += ch
                else:
                    out.append(ch * int(count))
                    count = ""
            return "".join(out)`,
      javascript: code`
        function decodeRuns(s) {
          let out = "", count = ""
          for (const ch of s) {
            if (ch >= "0" && ch <= "9") count += ch
            else { out += ch.repeat(Number(count)); count = "" }
          }
          return out
        }`,
    },
    editorial: { idea: "Collect digits until you meet a letter, then add that letter count times and start a new count.", time: "O(length of the answer)", space: "O(length of the answer)" },
  },
  {
    slug: "count-palindromic-substrings", title: "Count palindromic substrings", topic: "Strings", difficulty: "medium",
    statement: "Return how many substrings of `s` are palindromes. Substrings at different positions count separately, even if they're the same text — `\"aaa\"` has 6.",
    fn: "count_palindromes", params: ["s"], samples: 2,
    tests: [T(3, "abc"), T(6, "aaa"), T(0, ""), T(6, "abba"), T(10, "racecar"), T(4, "aab")],
    solution: {
      python: code`
        def count_palindromes(s):
            count = 0
            for centre in range(2 * len(s) - 1):
                lo, hi = centre // 2, centre // 2 + centre % 2
                while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                    count += 1
                    lo -= 1
                    hi += 1
            return count`,
      javascript: code`
        function countPalindromes(s) {
          let count = 0
          for (let centre = 0; centre < 2 * s.length - 1; centre++) {
            let lo = Math.floor(centre / 2), hi = lo + (centre % 2)
            while (lo >= 0 && hi < s.length && s[lo] === s[hi]) { count++; lo--; hi++ }
          }
          return count
        }`,
    },
    editorial: { idea: "Every palindrome has a centre — a letter, or the gap between two letters. Grow outwards from each of the 2n − 1 centres, counting while the ends match.", time: "O(n²)", space: "O(1)" },
  },
  {
    slug: "longest-palindromic-substring", title: "Longest palindromic substring", topic: "Strings", difficulty: "hard",
    statement: "Return the longest substring of `s` that is a palindrome. If several are equally long, return the one that starts first.",
    fn: "longest_palindrome", params: ["s"], samples: 2,
    tests: [T("bab", "babad"), T("bb", "cbbd"), T("a", "a"), T("", ""), T("geeksskeeg", "forgeeksskeegfor"), T("aba", "abacdfgdcaba"), T("racecar", "xracecarz")],
    solution: {
      python: code`
        def longest_palindrome(s):
            best = ""
            for centre in range(2 * len(s) - 1):
                lo, hi = centre // 2, centre // 2 + centre % 2
                while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                    lo -= 1
                    hi += 1
                if hi - lo - 1 > len(best):
                    best = s[lo + 1:hi]
            return best`,
      javascript: code`
        function longestPalindrome(s) {
          let best = ""
          for (let centre = 0; centre < 2 * s.length - 1; centre++) {
            let lo = Math.floor(centre / 2), hi = lo + (centre % 2)
            while (lo >= 0 && hi < s.length && s[lo] === s[hi]) { lo--; hi++ }
            if (hi - lo - 1 > best.length) best = s.slice(lo + 1, hi)
          }
          return best
        }`,
    },
    editorial: { idea: "Expand around each of the 2n − 1 centres and keep the longest. Only replace the best when the new one is strictly longer, so the earliest one wins a tie.", time: "O(n²)", space: "O(1)" },
  },
  {
    slug: "word-break", title: "Word break", topic: "Strings", difficulty: "hard",
    statement: "Return `True` (JavaScript: `true`) if `s` can be split into a sequence of one or more words from `words` (a word can be used many times). An empty `s` counts as split.",
    fn: "can_split", params: ["s", "words"], samples: 2,
    tests: [
      T(true, "krpexcode", ["krpex", "code"]), T(false, "catsandog", ["cats", "dog", "sand", "and", "cat"]), T(true, "applepenapple", ["apple", "pen"]), T(true, "", ["a"]),
      T(true, "aaaaaaa", ["aaaa", "aaa"]), T(false, "ab", ["a"]), T(false, "a".repeat(40) + "b", ["a", "aa", "aaa", "aaaa"]),
    ],
    solution: {
      python: code`
        def can_split(s, words):
            ok = [True] + [False] * len(s)
            for end in range(1, len(s) + 1):
                ok[end] = any(ok[end - len(w)] and s[end - len(w):end] == w for w in words if 0 < len(w) <= end)
            return ok[len(s)]`,
      javascript: code`
        function canSplit(s, words) {
          const ok = [true, ...Array(s.length).fill(false)]
          for (let end = 1; end <= s.length; end++)
            ok[end] = words.some((w) => w.length > 0 && w.length <= end && ok[end - w.length] && s.slice(end - w.length, end) === w)
          return ok[s.length]
        }`,
    },
    editorial: {
      idea: "Plain recursion tries the same tail again and again (the last test). Instead, let ok[i] say whether the first i letters can be split; ok[i] is true if some word ends at i and ok[i − its length] is true.",
      time: "O(n × number of words × word length)",
      space: "O(n)",
    },
  },

  // ---------- Lists ----------
  {
    slug: "reverse-a-list", title: "Reverse a list", topic: "Lists", difficulty: "easy",
    statement: "Return a new list with the items of `nums` in reverse order.",
    fn: "reverse_list", params: ["nums"], samples: 2,
    tests: [T([3, 2, 1], [1, 2, 3]), T([], []), T([5], [5]), T([2, 1, 1], [1, 1, 2]), T([-1, 0, 1, 9], [9, 1, 0, -1])],
    solution: {
      python: code`
        def reverse_list(nums):
            return nums[::-1]`,
      javascript: code`
        function reverseList(nums) {
          return [...nums].reverse()
        }`,
    },
    editorial: { idea: "Copy and reverse — or fill a new list from the last item to the first.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "average-of-a-list", title: "Average of a list", topic: "Lists", difficulty: "easy",
    statement: "Return the average (mean) of the numbers in `nums`. An empty list has an average of 0.",
    fn: "average", params: ["nums"], samples: 2,
    tests: [T(2.5, [1, 2, 3, 4]), T(5, [5]), T(0, []), T(0, [-2, 2]), T(1.5, [1, 2]), T(10 / 3, [1, 2, 7])],
    solution: {
      python: code`
        def average(nums):
            return sum(nums) / len(nums) if nums else 0`,
      javascript: code`
        function average(nums) {
          return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
        }`,
    },
    editorial: { idea: "Sum ÷ count, with a guard for the empty list so you never divide by zero.", time: "O(n)", space: "O(1)" },
  },
  {
    slug: "common-elements", title: "Common elements", topic: "Lists", difficulty: "easy",
    statement: "Return the numbers that appear in both `a` and `b`, each once, sorted from smallest to largest.",
    fn: "common", params: ["a", "b"], samples: 2,
    tests: [T([2, 3], [1, 2, 3, 4], [2, 3, 5]), T([], [1, 2], [3, 4]), T([1], [1, 1, 1], [1]), T([], [], [1]), T([-1, 5], [5, -1, 9, 5], [0, -1, 5]), T([4, 9], [4, 9, 5], [9, 4, 9, 8, 4])],
    solution: {
      python: code`
        def common(a, b):
            return sorted(set(a) & set(b))`,
      javascript: code`
        function common(a, b) {
          const inB = new Set(b)
          return [...new Set(a)].filter((x) => inB.has(x)).sort((x, y) => x - y)
        }`,
    },
    editorial: { idea: "Turn both lists into sets, keep what's in both, then sort. (In JavaScript, sort numbers with a compare function.)", time: "O(n log n)", space: "O(n)" },
  },
  {
    slug: "product-except-self", title: "Product of everything else", topic: "Lists", difficulty: "medium",
    statement: "Return a list where position `i` holds the product of every number in `nums` except `nums[i]`. Try it without division — the list can contain zeros.",
    fn: "product_except_self", params: ["nums"], samples: 2,
    tests: [T([24, 12, 8, 6], [1, 2, 3, 4]), T([3, 2], [2, 3]), T([2, 0, 0], [0, 1, 2]), T([0, 0, 0], [0, 0, 3]), T([1], [5]), T([0, 0, 9, 0, 0], [-1, 1, 0, -3, 3])],
    solution: {
      python: code`
        def product_except_self(nums):
            out = [1] * len(nums)
            left = 1
            for i in range(len(nums)):
                out[i] = left
                left *= nums[i]
            right = 1
            for i in range(len(nums) - 1, -1, -1):
                out[i] *= right
                right *= nums[i]
            return out`,
      javascript: code`
        function productExceptSelf(nums) {
          const out = Array(nums.length).fill(1)
          let left = 1
          for (let i = 0; i < nums.length; i++) { out[i] = left; left *= nums[i] }
          let right = 1
          for (let i = nums.length - 1; i >= 0; i--) { out[i] *= right; right *= nums[i] }
          return out
        }`,
    },
    editorial: { idea: "The answer at i is (product of everything left of i) × (product of everything right of i). One pass from the left and one from the right build both.", time: "O(n)", space: "O(1) beyond the answer" },
  },
  {
    slug: "majority-element", title: "Majority element", topic: "Lists", difficulty: "medium",
    statement: "One number in `nums` appears more than half the time. Return it.",
    fn: "majority", params: ["nums"], samples: 2,
    tests: [T(3, [3, 2, 3]), T(2, [2, 2, 1, 1, 1, 2, 2]), T(7, [7]), T(1, [1, 1, 2]), T(5, [5, 5, 5, 1, 2]), T(-4, [9, -4, -4, 9, -4])],
    solution: {
      python: code`
        def majority(nums):
            candidate, votes = None, 0
            for x in nums:
                if votes == 0:
                    candidate = x
                votes += 1 if x == candidate else -1
            return candidate`,
      javascript: code`
        function majority(nums) {
          let candidate = null, votes = 0
          for (const x of nums) {
            if (votes === 0) candidate = x
            votes += x === candidate ? 1 : -1
          }
          return candidate
        }`,
    },
    editorial: { idea: "Counting with a dictionary works. Cleverer (Boyer–Moore voting): pair each majority vote off against a different number — the majority still has votes left at the end.", time: "O(n)", space: "O(1)" },
  },
  {
    slug: "container-with-most-water", title: "Container with most water", topic: "Lists", difficulty: "medium",
    statement: "`heights[i]` is the height of a vertical line at position `i`. Two lines and the ground form a container holding `(distance between them) × (the shorter line)` units of water. Return the most water any two lines can hold.",
    fn: "max_water", params: ["heights"], samples: 2,
    tests: [T(49, [1, 8, 6, 2, 5, 4, 8, 3, 7]), T(1, [1, 1]), T(16, [4, 3, 2, 1, 4]), T(2, [1, 2, 1]), T(17, [2, 3, 4, 5, 18, 17, 6]), T(0, [5])],
    solution: {
      python: code`
        def max_water(heights):
            lo, hi, best = 0, len(heights) - 1, 0
            while lo < hi:
                best = max(best, (hi - lo) * min(heights[lo], heights[hi]))
                if heights[lo] < heights[hi]:
                    lo += 1
                else:
                    hi -= 1
            return best`,
      javascript: code`
        function maxWater(heights) {
          let lo = 0, hi = heights.length - 1, best = 0
          while (lo < hi) {
            best = Math.max(best, (hi - lo) * Math.min(heights[lo], heights[hi]))
            if (heights[lo] < heights[hi]) lo++
            else hi--
          }
          return best
        }`,
    },
    editorial: { idea: "Start with the widest pair. The shorter line limits the water, and moving the taller one inwards can't help — so always move the shorter one.", time: "O(n)", space: "O(1)" },
  },
  {
    slug: "sort-zeros-ones-twos", title: "Sort 0s, 1s and 2s", topic: "Lists", difficulty: "medium",
    statement: "`nums` holds only 0, 1 and 2. Return them sorted. Try a single pass without a sorting function.",
    fn: "sort_012", params: ["nums"], samples: 2,
    tests: [T([0, 0, 1, 1, 2, 2], [2, 0, 2, 1, 1, 0]), T([0, 1, 2], [2, 0, 1]), T([], []), T([1], [1]), T([0, 0, 2, 2, 2], [2, 2, 0, 2, 0]), T([1, 1, 1], [1, 1, 1])],
    solution: {
      python: code`
        def sort_012(nums):
            a = list(nums)
            lo, mid, hi = 0, 0, len(a) - 1
            while mid <= hi:
                if a[mid] == 0:
                    a[lo], a[mid] = a[mid], a[lo]
                    lo += 1
                    mid += 1
                elif a[mid] == 1:
                    mid += 1
                else:
                    a[mid], a[hi] = a[hi], a[mid]
                    hi -= 1
            return a`,
      javascript: code`
        function sort012(nums) {
          const a = [...nums]
          let lo = 0, mid = 0, hi = a.length - 1
          while (mid <= hi) {
            if (a[mid] === 0) { [a[lo], a[mid]] = [a[mid], a[lo]]; lo++; mid++ }
            else if (a[mid] === 1) mid++
            else { [a[mid], a[hi]] = [a[hi], a[mid]]; hi-- }
          }
          return a
        }`,
    },
    editorial: { idea: "The \"Dutch national flag\": keep 0s before lo, 2s after hi and 1s in between, swapping each item into its zone as you pass it. (Counting the three values works too.)", time: "O(n)", space: "O(n) for the copy" },
  },
  {
    slug: "jump-game", title: "Jump game", topic: "Lists", difficulty: "medium",
    statement: "You start at position 0 of `nums`. From position `i` you can jump forward up to `nums[i]` places. Return `True` (JavaScript: `true`) if you can reach the last position.",
    fn: "can_reach_end", params: ["nums"], samples: 2,
    tests: [T(true, [2, 3, 1, 1, 4]), T(false, [3, 2, 1, 0, 4]), T(true, [0]), T(false, [1, 0, 1]), T(true, [2, 0, 0]), T(true, [1, 1, 1, 1]), T(false, [0, 1])],
    solution: {
      python: code`
        def can_reach_end(nums):
            reach = 0
            for i, jump in enumerate(nums):
                if i > reach:
                    return False
                reach = max(reach, i + jump)
            return True`,
      javascript: code`
        function canReachEnd(nums) {
          let reach = 0
          for (let i = 0; i < nums.length; i++) {
            if (i > reach) return false
            reach = Math.max(reach, i + nums[i])
          }
          return true
        }`,
    },
    editorial: { idea: "Track the furthest position you can reach so far. If you ever stand beyond it, you're stuck.", time: "O(n)", space: "O(1)" },
  },
  {
    slug: "longest-consecutive-run", title: "Longest consecutive run", topic: "Lists", difficulty: "hard",
    statement: "Return the length of the longest run of consecutive whole numbers (like 4, 5, 6, 7) that can be made from the numbers in `nums`, in any order. Aim for better than sorting.",
    fn: "longest_run", params: ["nums"], samples: 2,
    tests: [T(4, [100, 4, 200, 1, 3, 2]), T(9, [0, 3, 7, 2, 5, 8, 4, 6, 0, 1]), T(0, []), T(3, [1, 2, 0, 1]), T(1, [5]), T(1, [10, 30, 20]), T(5, [-2, -1, 0, 1, 2, 9])],
    solution: {
      python: code`
        def longest_run(nums):
            seen = set(nums)
            best = 0
            for x in seen:
                if x - 1 not in seen:
                    length = 1
                    while x + length in seen:
                        length += 1
                    best = max(best, length)
            return best`,
      javascript: code`
        function longestRun(nums) {
          const seen = new Set(nums)
          let best = 0
          for (const x of seen) {
            if (seen.has(x - 1)) continue
            let length = 1
            while (seen.has(x + length)) length++
            best = Math.max(best, length)
          }
          return best
        }`,
    },
    editorial: { idea: "Put everything in a set. Only start counting from a number whose predecessor is missing — the start of a run — so each number is counted once.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "subarray-sum-equals-k", title: "Subarrays that add up to k", topic: "Lists", difficulty: "hard",
    statement: "Return how many contiguous, non-empty slices of `nums` add up to exactly `k`. Numbers can be negative.",
    fn: "count_subarrays", params: ["nums", "k"], samples: 2,
    tests: [T(2, [1, 1, 1], 2), T(2, [1, 2, 3], 3), T(3, [1, -1, 0], 0), T(0, [], 0), T(4, [3, 4, 7, 2, -3, 1, 4, 2], 7), T(10, [0, 0, 0, 0], 0)],
    solution: {
      python: code`
        def count_subarrays(nums, k):
            seen = {0: 1}
            total = count = 0
            for x in nums:
                total += x
                count += seen.get(total - k, 0)
                seen[total] = seen.get(total, 0) + 1
            return count`,
      javascript: code`
        function countSubarrays(nums, k) {
          const seen = new Map([[0, 1]])
          let total = 0, count = 0
          for (const x of nums) {
            total += x
            count += seen.get(total - k) ?? 0
            seen.set(total, (seen.get(total) ?? 0) + 1)
          }
          return count
        }`,
    },
    editorial: { idea: "A slice adds up to k exactly when (running total now) − (running total before it) = k. Count earlier running totals in a dictionary and look up total − k at each step.", time: "O(n)", space: "O(n)" },
  },

  // ---------- Dictionaries ----------
  {
    slug: "first-repeated", title: "First repeated number", topic: "Dictionaries", difficulty: "easy",
    statement: "Going from left to right through `nums`, return the first number you meet for the second time. If nothing repeats, return `None` (JavaScript: `null`).",
    fn: "first_repeat", params: ["nums"], samples: 2,
    tests: [T(2, [2, 5, 1, 2, 3, 5]), T(null, [1, 2, 3]), T(5, [5, 5]), T(null, []), T(2, [1, 2, 3, 2, 1]), T(4, [3, 4, 4, 3])],
    solution: {
      python: code`
        def first_repeat(nums):
            seen = set()
            for x in nums:
                if x in seen:
                    return x
                seen.add(x)
            return None`,
      javascript: code`
        function firstRepeat(nums) {
          const seen = new Set()
          for (const x of nums) {
            if (seen.has(x)) return x
            seen.add(x)
          }
          return null
        }`,
    },
    editorial: { idea: "Remember what you've seen in a set; the first number already in it is the answer.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "ransom-note", title: "Ransom note", topic: "Dictionaries", difficulty: "easy",
    statement: "Can you write `note` by cutting letters out of `letters`? Each character in `letters` can be used once. Return `True` (JavaScript: `true`) or `False`.",
    fn: "can_build", params: ["note", "letters"], samples: 2,
    tests: [T(true, "aa", "aab"), T(false, "aa", "ab"), T(true, "", "x"), T(true, "abc", "cba"), T(false, "a", ""), T(false, "hello", "helo"), T(true, "hi there", "the hire")],
    solution: {
      python: code`
        from collections import Counter

        def can_build(note, letters):
            have = Counter(letters)
            return all(have[ch] >= n for ch, n in Counter(note).items())`,
      javascript: code`
        function canBuild(note, letters) {
          const have = {}
          for (const ch of letters) have[ch] = (have[ch] || 0) + 1
          for (const ch of note) {
            if (!have[ch]) return false
            have[ch]--
          }
          return true
        }`,
    },
    editorial: { idea: "Count the characters you have, then spend them on the note; fail as soon as one runs out.", time: "O(n + m)", space: "O(distinct characters)" },
  },
  {
    slug: "isomorphic-strings", title: "Isomorphic strings", topic: "Dictionaries", difficulty: "medium",
    statement: "Two strings are isomorphic if you can get `b` by replacing each character of `a` with another, where every occurrence of a character is replaced the same way and no two different characters turn into the same one. Return whether `a` and `b` are isomorphic.",
    fn: "is_isomorphic", params: ["a", "b"], samples: 2,
    tests: [T(true, "egg", "add"), T(false, "foo", "bar"), T(true, "paper", "title"), T(false, "ab", "aa"), T(true, "", ""), T(false, "badc", "baba"), T(false, "abc", "ab")],
    solution: {
      python: code`
        def is_isomorphic(a, b):
            if len(a) != len(b):
                return False
            fwd, back = {}, {}
            for x, y in zip(a, b):
                if fwd.setdefault(x, y) != y or back.setdefault(y, x) != x:
                    return False
            return True`,
      javascript: code`
        function isIsomorphic(a, b) {
          if (a.length !== b.length) return false
          const fwd = new Map(), back = new Map()
          for (let i = 0; i < a.length; i++) {
            const x = a[i], y = b[i]
            if ((fwd.has(x) && fwd.get(x) !== y) || (back.has(y) && back.get(y) !== x)) return false
            fwd.set(x, y)
            back.set(y, x)
          }
          return true
        }`,
    },
    editorial: { idea: "Keep two dictionaries — a→b and b→a — so a character can't map to two things, and two characters can't map to the same one.", time: "O(n)", space: "O(distinct characters)" },
  },
  {
    slug: "top-k-frequent", title: "Top k frequent numbers", topic: "Dictionaries", difficulty: "medium",
    statement: "Return the `k` numbers that appear most often in `nums`, most frequent first. When two numbers appear equally often, the smaller one comes first.",
    fn: "top_k", params: ["nums", "k"], samples: 2,
    tests: [T([1, 2], [1, 1, 1, 2, 2, 3], 2), T([4, 5], [4, 4, 5, 5, 6], 2), T([7], [7], 1), T([1, 2, 3], [3, 1, 2, 2, 3, 1], 3), T([7], [5, 6, 6, 7, 7, 7], 1), T([-1, 2, 0], [2, -1, 2, -1, 0, -1], 3)],
    solution: {
      python: code`
        from collections import Counter

        def top_k(nums, k):
            counts = Counter(nums)
            return sorted(counts, key=lambda x: (-counts[x], x))[:k]`,
      javascript: code`
        function topK(nums, k) {
          const counts = new Map()
          for (const x of nums) counts.set(x, (counts.get(x) ?? 0) + 1)
          return [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a - b).slice(0, k)
        }`,
    },
    editorial: { idea: "Count with a dictionary, then sort the distinct numbers by (count, high first) and then by value, and take k.", time: "O(n log n)", space: "O(n)" },
  },
  {
    slug: "word-pattern", title: "Word pattern", topic: "Dictionaries", difficulty: "medium",
    statement: "Return `True` (JavaScript: `true`) if the words of `text` (separated by single spaces) follow `pattern`: each letter stands for exactly one word, and different letters stand for different words.",
    fn: "follows_pattern", params: ["pattern", "text"], samples: 2,
    tests: [T(true, "abba", "dog cat cat dog"), T(false, "abba", "dog cat cat fish"), T(true, "aaaa", "dog dog dog dog"), T(false, "abba", "dog dog dog dog"), T(false, "ab", "dog"), T(true, "abc", "red green blue")],
    solution: {
      python: code`
        def follows_pattern(pattern, text):
            words = text.split(" ")
            if len(words) != len(pattern):
                return False
            return len(set(pattern)) == len(set(words)) == len(set(zip(pattern, words)))`,
      javascript: code`
        function followsPattern(pattern, text) {
          const words = text.split(" ")
          if (words.length !== pattern.length) return false
          const fwd = new Map(), back = new Map()
          for (let i = 0; i < words.length; i++) {
            const p = pattern[i], w = words[i]
            if ((fwd.has(p) && fwd.get(p) !== w) || (back.has(w) && back.get(w) !== p)) return false
            fwd.set(p, w)
            back.set(w, p)
          }
          return true
        }`,
    },
    editorial: { idea: "The same two-way mapping as isomorphic strings, but between letters and words. A neat check: the number of distinct letters, distinct words and distinct (letter, word) pairs must all be equal.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "count-pairs-with-sum", title: "Count pairs with a sum", topic: "Dictionaries", difficulty: "medium",
    statement: "Return how many pairs of positions `i < j` have `nums[i] + nums[j] == k`. Do better than checking every pair.",
    fn: "count_pairs", params: ["nums", "k"], samples: 2,
    tests: [T(2, [1, 5, 7, -1], 6), T(6, [1, 1, 1, 1], 2), T(0, [], 3), T(3, [1, 5, 7, -1, 5], 6), T(3, [3, 3, 3], 6), T(1, [0, 0], 0)],
    solution: {
      python: code`
        def count_pairs(nums, k):
            seen, count = {}, 0
            for x in nums:
                count += seen.get(k - x, 0)
                seen[x] = seen.get(x, 0) + 1
            return count`,
      javascript: code`
        function countPairs(nums, k) {
          const seen = new Map()
          let count = 0
          for (const x of nums) {
            count += seen.get(k - x) ?? 0
            seen.set(x, (seen.get(x) ?? 0) + 1)
          }
          return count
        }`,
    },
    editorial: { idea: "Walk left to right. Each number pairs with every earlier k − x, so keep counts of what you've seen and add count[k − x].", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "anagram-positions", title: "Find anagram positions", topic: "Dictionaries", difficulty: "medium",
    statement: "Return every starting position in `s` where a substring is an anagram of `p` (the same letters in any order), in increasing order.",
    fn: "anagram_positions", params: ["s", "p"], samples: 2,
    tests: [T([0, 6], "cbaebabacd", "abc"), T([0, 1, 2], "abab", "ab"), T([], "a", "ab"), T([0, 1, 2], "aaaa", "aa"), T([1], "baa", "aa"), T([], "xyz", "abc")],
    solution: {
      python: code`
        from collections import Counter

        def anagram_positions(s, p):
            n, out = len(p), []
            want, window = Counter(p), Counter(s[:n])
            for i in range(len(s) - n + 1):
                if i > 0:
                    window[s[i - 1]] -= 1
                    window[s[i + n - 1]] += 1
                if all(window[ch] == c for ch, c in want.items()):
                    out.append(i)
            return out`,
      javascript: code`
        function anagramPositions(s, p) {
          const n = p.length, out = []
          const want = {}, window = {}
          for (const ch of p) want[ch] = (want[ch] || 0) + 1
          for (let i = 0; i < s.length; i++) {
            window[s[i]] = (window[s[i]] || 0) + 1
            if (i >= n) window[s[i - n]]--
            if (i >= n - 1 && Object.keys(want).every((ch) => window[ch] === want[ch])) out.push(i - n + 1)
          }
          return out
        }`,
    },
    editorial: { idea: "Slide a window of length len(p) along s, updating its letter counts by one letter in and one out, and compare them with p's counts.", time: "O(n × alphabet)", space: "O(alphabet)" },
  },

  // ---------- Maths and loops ----------
  {
    slug: "least-common-multiple", title: "Least common multiple", topic: "Maths and loops", difficulty: "easy",
    statement: "Return the smallest positive number that both positive whole numbers `a` and `b` divide into exactly.",
    fn: "lcm", params: ["a", "b"], samples: 2,
    tests: [T(12, 4, 6), T(15, 3, 5), T(7, 7, 7), T(9, 1, 9), T(36, 12, 18), T(42, 21, 6)],
    solution: {
      python: code`
        def lcm(a, b):
            x, y = a, b
            while y:
                x, y = y, x % y
            return a // x * b`,
      javascript: code`
        function lcm(a, b) {
          let x = a, y = b
          while (y) [x, y] = [y, x % y]
          return (a / x) * b
        }`,
    },
    editorial: { idea: "lcm(a, b) = a × b ÷ gcd(a, b), and the gcd comes from Euclid's algorithm. Divide before multiplying to keep numbers small.", time: "O(log min(a, b))", space: "O(1)" },
  },
  {
    slug: "perfect-number", title: "Perfect number", topic: "Maths and loops", difficulty: "easy",
    statement: "A perfect number equals the sum of its divisors other than itself — 6 = 1 + 2 + 3. Return whether the positive number `n` is perfect.",
    fn: "is_perfect", params: ["n"], samples: 2,
    tests: [T(true, 6), T(false, 12), T(true, 28), T(false, 1), T(true, 496), T(false, 27), T(true, 8128)],
    solution: {
      python: code`
        def is_perfect(n):
            if n < 2:
                return False
            total, d = 1, 2
            while d * d <= n:
                if n % d == 0:
                    total += d
                    if d != n // d:
                        total += n // d
                d += 1
            return total == n`,
      javascript: code`
        function isPerfect(n) {
          if (n < 2) return false
          let total = 1
          for (let d = 2; d * d <= n; d++) {
            if (n % d === 0) {
              total += d
              if (d !== n / d) total += n / d
            }
          }
          return total === n
        }`,
    },
    editorial: { idea: "Divisors come in pairs d and n ÷ d, so you only need to try d up to √n.", time: "O(√n)", space: "O(1)" },
  },
  {
    slug: "sum-of-multiples", title: "Multiples of 3 or 5", topic: "Maths and loops", difficulty: "easy",
    statement: "Return the sum of all positive whole numbers below `n` that are multiples of 3 or 5. Below 10 they are 3, 5, 6 and 9, which add up to 23.",
    fn: "sum_of_multiples", params: ["n"], samples: 2,
    tests: [T(23, 10), T(0, 1), T(60, 16), T(0, 0), T(78, 20), T(2318, 100), T(233168, 1000)],
    solution: {
      python: code`
        def sum_of_multiples(n):
            return sum(x for x in range(n) if x % 3 == 0 or x % 5 == 0)`,
      javascript: code`
        function sumOfMultiples(n) {
          let total = 0
          for (let x = 1; x < n; x++) if (x % 3 === 0 || x % 5 === 0) total += x
          return total
        }`,
    },
    editorial: { idea: "A loop with an \"or\" check is enough. (There's also a formula: add the multiples of 3 and of 5, then subtract the multiples of 15, which were counted twice.)", time: "O(n)", space: "O(1)" },
  },
  {
    slug: "collatz-steps", title: "Collatz steps", topic: "Maths and loops", difficulty: "easy",
    statement: "Start from the positive number `n`. If it's even, halve it; if it's odd, make it 3n + 1. Return how many steps it takes to reach 1.",
    fn: "collatz_steps", params: ["n"], samples: 2,
    tests: [T(8, 6), T(0, 1), T(1, 2), T(16, 7), T(111, 27), T(7, 3)],
    solution: {
      python: code`
        def collatz_steps(n):
            steps = 0
            while n != 1:
                n = n // 2 if n % 2 == 0 else 3 * n + 1
                steps += 1
            return steps`,
      javascript: code`
        function collatzSteps(n) {
          let steps = 0
          while (n !== 1) {
            n = n % 2 === 0 ? n / 2 : 3 * n + 1
            steps++
          }
          return steps
        }`,
    },
    editorial: { idea: "A while loop that applies the rule and counts. (Nobody has proved it always reaches 1 — but it does for every number ever tried.)", time: "Depends on n — no known bound", space: "O(1)" },
  },
  {
    slug: "count-set-bits", title: "Count the 1 bits", topic: "Maths and loops", difficulty: "easy",
    statement: "Return how many 1s there are in the binary form of the non-negative number `n`. 5 is `101` in binary, so the answer is 2.",
    fn: "count_bits", params: ["n"], samples: 2,
    tests: [T(2, 5), T(0, 0), T(3, 7), T(8, 255), T(1, 1024), T(10, 1023), T(1, 1)],
    solution: {
      python: code`
        def count_bits(n):
            count = 0
            while n:
                count += n & 1
                n >>= 1
            return count`,
      javascript: code`
        function countBits(n) {
          let count = 0
          while (n > 0) {
            count += n % 2
            n = Math.floor(n / 2)
          }
          return count
        }`,
    },
    editorial: { idea: "Look at the last bit (n % 2, or n & 1), then shift it away (n // 2, or n >> 1) until n is 0.", time: "O(number of bits)", space: "O(1)" },
  },
  {
    slug: "happy-number", title: "Happy number", topic: "Maths and loops", difficulty: "medium",
    statement: "Replace a positive number by the sum of the squares of its digits, again and again. If this reaches 1, the number is happy; otherwise it loops forever. Return whether `n` is happy. (19 → 82 → 68 → 100 → 1, so 19 is happy.)",
    fn: "is_happy", params: ["n"], samples: 2,
    tests: [T(true, 19), T(false, 2), T(true, 1), T(true, 7), T(false, 4), T(true, 100), T(false, 20)],
    solution: {
      python: code`
        def is_happy(n):
            seen = set()
            while n != 1 and n not in seen:
                seen.add(n)
                n = sum(int(d) ** 2 for d in str(n))
            return n == 1`,
      javascript: code`
        function isHappy(n) {
          const seen = new Set()
          while (n !== 1 && !seen.has(n)) {
            seen.add(n)
            n = [...String(n)].reduce((s, d) => s + Number(d) ** 2, 0)
          }
          return n === 1
        }`,
    },
    editorial: { idea: "Keep a set of the numbers you've visited. Reaching one again means a loop — not happy.", time: "Small — the numbers quickly drop below a few hundred", space: "O(numbers visited)" },
  },
  {
    slug: "prime-factors", title: "Prime factors", topic: "Maths and loops", difficulty: "medium",
    statement: "Return the prime factors of the positive number `n`, smallest first, repeated as often as they divide it. 12 → `[2, 2, 3]`; 1 has none.",
    fn: "prime_factors", params: ["n"], samples: 2,
    tests: [T([2, 2, 3], 12), T([], 1), T([13], 13), T([2, 2, 5, 5], 100), T([2, 2, 2, 3, 3, 5], 360), T([89, 97], 8633), T([999983], 999983)],
    solution: {
      python: code`
        def prime_factors(n):
            out, d = [], 2
            while d * d <= n:
                while n % d == 0:
                    out.append(d)
                    n //= d
                d += 1
            if n > 1:
                out.append(n)
            return out`,
      javascript: code`
        function primeFactors(n) {
          const out = []
          for (let d = 2; d * d <= n; d++) {
            while (n % d === 0) { out.push(d); n /= d }
          }
          if (n > 1) out.push(n)
          return out
        }`,
    },
    editorial: { idea: "Divide out 2 as long as you can, then 3, then 4 (never divides by then), and so on. Stop at √n: whatever is left above 1 is itself prime.", time: "O(√n)", space: "O(log n)" },
  },
  {
    slug: "integer-square-root", title: "Integer square root", topic: "Maths and loops", difficulty: "medium",
    statement: "Return the square root of the non-negative whole number `n`, rounded down — without using a built-in square root or power function.",
    fn: "isqrt", params: ["n"], samples: 2,
    tests: [T(2, 8), T(4, 16), T(0, 0), T(1, 1), T(9, 99), T(46339, 2147395599), T(100000, 10000000000)],
    solution: {
      python: code`
        def isqrt(n):
            lo, hi = 0, n
            while lo < hi:
                mid = (lo + hi + 1) // 2
                if mid * mid <= n:
                    lo = mid
                else:
                    hi = mid - 1
            return lo`,
      javascript: code`
        function isqrt(n) {
          let lo = 0, hi = n
          while (lo < hi) {
            const mid = Math.floor((lo + hi + 1) / 2)
            if (mid * mid <= n) lo = mid
            else hi = mid - 1
          }
          return lo
        }`,
    },
    editorial: { idea: "Binary search for the largest x with x × x ≤ n. Rounding the middle up stops the search getting stuck when lo and hi are next to each other.", time: "O(log n)", space: "O(1)" },
  },
  {
    slug: "spreadsheet-column-name", title: "Spreadsheet column name", topic: "Maths and loops", difficulty: "medium",
    statement: "Spreadsheet columns are named A, B, … Z, then AA, AB, … AZ, BA, … ZZ, then AAA and so on. Return the name of column number `n` (column 1 is A).",
    fn: "column_name", params: ["n"], samples: 3,
    tests: [T("A", 1), T("AB", 28), T("ZY", 701), T("Z", 26), T("AZ", 52), T("AA", 27), T("ZZZ", 18278)],
    solution: {
      python: code`
        def column_name(n):
            name = ""
            while n > 0:
                n, r = divmod(n - 1, 26)
                name = chr(65 + r) + name
            return name`,
      javascript: code`
        function columnName(n) {
          let name = ""
          while (n > 0) {
            const r = (n - 1) % 26
            name = String.fromCharCode(65 + r) + name
            n = Math.floor((n - 1) / 26)
          }
          return name
        }`,
    },
    editorial: { idea: "It's base 26 with digits 1–26 instead of 0–25. Subtract 1 before each divide-and-remainder step so that Z (26) doesn't turn into a carry.", time: "O(log n)", space: "O(log n)" },
  },
  {
    slug: "factorial-trailing-zeros", title: "Zeros at the end of n!", topic: "Maths and loops", difficulty: "medium",
    statement: "Return how many zeros `n!` (n factorial) ends with — without computing n!, which gets huge.",
    fn: "trailing_zeros", params: ["n"], samples: 2,
    tests: [T(1, 5), T(2, 10), T(0, 0), T(0, 3), T(6, 25), T(24, 100), T(249, 1000), T(24999999, 100000000)],
    solution: {
      python: code`
        def trailing_zeros(n):
            count = 0
            while n:
                n //= 5
                count += n
            return count`,
      javascript: code`
        function trailingZeros(n) {
          let count = 0
          while (n > 0) {
            n = Math.floor(n / 5)
            count += n
          }
          return count
        }`,
    },
    editorial: { idea: "Each zero comes from a 2 × 5, and 2s are plentiful, so count the 5s: one from each multiple of 5, another from each multiple of 25, and so on.", time: "O(log n)", space: "O(1)" },
  },

  // ---------- Recursion ----------
  {
    slug: "tower-of-hanoi", title: "Tower of Hanoi", topic: "Recursion", difficulty: "medium",
    statement:
      "`n` discs of different sizes sit on peg `\"A\"`, largest at the bottom. Move them all to peg `\"C\"`, using `\"B\"` to help. You move one disc at a time, and a disc may never sit on a smaller one.\n\nReturn the moves in order, each as `[from, to]`, using the fewest moves possible.",
    fn: "hanoi", params: ["n"], samples: 2,
    tests: [
      T([["A", "C"]], 1),
      T([["A", "B"], ["A", "C"], ["B", "C"]], 2),
      T([], 0),
      T([["A", "C"], ["A", "B"], ["C", "B"], ["A", "C"], ["B", "A"], ["B", "C"], ["A", "C"]], 3),
      T(
        [["A", "B"], ["A", "C"], ["B", "C"], ["A", "B"], ["C", "A"], ["C", "B"], ["A", "B"], ["A", "C"], ["B", "C"], ["B", "A"], ["C", "A"], ["B", "C"], ["A", "B"], ["A", "C"], ["B", "C"]],
        4,
      ),
    ],
    solution: {
      python: code`
        def hanoi(n):
            moves = []
            def move(k, src, dst, via):
                if k == 0:
                    return
                move(k - 1, src, via, dst)
                moves.append([src, dst])
                move(k - 1, via, dst, src)
            move(n, "A", "C", "B")
            return moves`,
      javascript: code`
        function hanoi(n) {
          const moves = []
          const move = (k, src, dst, via) => {
            if (k === 0) return
            move(k - 1, src, via, dst)
            moves.push([src, dst])
            move(k - 1, via, dst, src)
          }
          move(n, "A", "C", "B")
          return moves
        }`,
    },
    editorial: { idea: "To move n discs: move the top n − 1 out of the way onto the spare peg, move the biggest disc, then move the n − 1 back on top of it. That takes 2ⁿ − 1 moves.", time: "O(2ⁿ)", space: "O(n) for the recursion, plus the moves" },
  },
  {
    slug: "generate-parentheses", title: "Generate parentheses", topic: "Recursion", difficulty: "medium",
    statement: "Return every balanced string made of `n` pairs of brackets `(` and `)`, in any order. For `n = 2` that's `\"(())\"` and `\"()()\"`.",
    fn: "parentheses", params: ["n"], samples: 2, unordered: true,
    tests: [
      T(["()"], 1), T(["(())", "()()"], 2), T([""], 0), T(["((()))", "(()())", "(())()", "()(())", "()()()"], 3),
      T(["(((())))", "((()()))", "((())())", "((()))()", "(()(()))", "(()()())", "(()())()", "(())(())", "(())()()", "()((()))", "()(()())", "()(())()", "()()(())", "()()()()"], 4),
    ],
    solution: {
      python: code`
        def parentheses(n):
            out = []
            def build(s, opened, closed):
                if len(s) == 2 * n:
                    out.append(s)
                    return
                if opened < n:
                    build(s + "(", opened + 1, closed)
                if closed < opened:
                    build(s + ")", opened, closed + 1)
            build("", 0, 0)
            return out`,
      javascript: code`
        function parentheses(n) {
          const out = []
          const build = (s, opened, closed) => {
            if (s.length === 2 * n) return void out.push(s)
            if (opened < n) build(s + "(", opened + 1, closed)
            if (closed < opened) build(s + ")", opened, closed + 1)
          }
          build("", 0, 0)
          return out
        }`,
    },
    editorial: { idea: "Build the string one bracket at a time. You may open while fewer than n are open, and close while there are more opens than closes — so every string you finish is balanced.", time: "O(answers × n)", space: "O(n) for the recursion" },
  },
  {
    slug: "phone-letter-combinations", title: "Phone keypad letters", topic: "Recursion", difficulty: "medium",
    statement:
      "On an old phone keypad, 2 = abc, 3 = def, 4 = ghi, 5 = jkl, 6 = mno, 7 = pqrs, 8 = tuv and 9 = wxyz. Given `digits` (only 2–9), return every word you could mean by typing them, in any order. No digits means no words: return an empty list.",
    fn: "keypad_words", params: ["digits"], samples: 2, unordered: true,
    tests: [
      T(["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"], "23"), T([], ""), T(["a", "b", "c"], "2"), T(["p", "q", "r", "s"], "7"),
      T([..."pqrs"].flatMap((a) => [..."wxyz"].map((b) => a + b)), "79"), T([..."ghi"].flatMap((a) => [..."mno"].flatMap((b) => [..."tuv"].map((c) => a + b + c))), "468"),
    ],
    solution: {
      python: code`
        KEYS = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}

        def keypad_words(digits):
            if not digits:
                return []
            words = [""]
            for d in digits:
                words = [w + ch for w in words for ch in KEYS[d]]
            return words`,
      javascript: code`
        const KEYS = { 2: "abc", 3: "def", 4: "ghi", 5: "jkl", 6: "mno", 7: "pqrs", 8: "tuv", 9: "wxyz" }

        function keypadWords(digits) {
          if (!digits) return []
          let words = [""]
          for (const d of digits) words = words.flatMap((w) => [...KEYS[d]].map((ch) => w + ch))
          return words
        }`,
    },
    editorial: { idea: "Start with one empty word; for each digit, extend every word so far with each of that key's letters.", time: "O(4ⁿ × n)", space: "O(4ⁿ × n)" },
  },
  {
    slug: "combinations", title: "Combinations", topic: "Recursion", difficulty: "medium",
    statement: "Return every way to choose `k` different numbers from 1 to `n`. Each choice is a list in increasing order; the choices can come in any order.",
    fn: "choose", params: ["n", "k"], samples: 2, unordered: true,
    tests: [
      T([[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]], 4, 2), T([[1]], 1, 1), T([[1, 2, 3]], 3, 3), T([[]], 3, 0),
      T([[1, 2, 3, 4], [1, 2, 3, 5], [1, 2, 4, 5], [1, 3, 4, 5], [2, 3, 4, 5]], 5, 4), T([[1], [2], [3]], 3, 1),
    ],
    solution: {
      python: code`
        def choose(n, k):
            out = []
            def pick(start, chosen):
                if len(chosen) == k:
                    out.append(chosen[:])
                    return
                for x in range(start, n + 1):
                    chosen.append(x)
                    pick(x + 1, chosen)
                    chosen.pop()
            pick(1, [])
            return out`,
      javascript: code`
        function choose(n, k) {
          const out = []
          const pick = (start, chosen) => {
            if (chosen.length === k) return void out.push([...chosen])
            for (let x = start; x <= n; x++) {
              chosen.push(x)
              pick(x + 1, chosen)
              chosen.pop()
            }
          }
          pick(1, [])
          return out
        }`,
    },
    editorial: { idea: "Backtracking: add a number, recurse only with bigger numbers (so each choice comes out once, in order), then take it back off and try the next.", time: "O(C(n, k) × k)", space: "O(k) for the recursion" },
  },
  {
    slug: "combination-sum", title: "Combination sum", topic: "Recursion", difficulty: "hard",
    statement:
      "`candidates` are different positive numbers. Return every combination of them that adds up to `target`, where a number may be used any number of times. Each combination is a list in increasing order; the combinations can come in any order.",
    fn: "combination_sum", params: ["candidates", "target"], samples: 2, unordered: true,
    tests: [
      T([[2, 2, 3], [7]], [2, 3, 6, 7], 7), T([[2, 2, 2, 2], [2, 3, 3], [3, 5]], [2, 3, 5], 8), T([], [2], 1), T([[1, 1]], [1], 2), T([[3, 3, 3, 3], [4, 4, 4]], [4, 3], 12),
      T([[2, 2, 2, 2, 2], [2, 8], [5, 5]], [8, 5, 2], 10),
    ],
    solution: {
      python: code`
        def combination_sum(candidates, target):
            nums, out = sorted(candidates), []
            def pick(start, left, chosen):
                if left == 0:
                    out.append(chosen[:])
                    return
                for i in range(start, len(nums)):
                    if nums[i] > left:
                        break
                    chosen.append(nums[i])
                    pick(i, left - nums[i], chosen)
                    chosen.pop()
            pick(0, target, [])
            return out`,
      javascript: code`
        function combinationSum(candidates, target) {
          const nums = [...candidates].sort((a, b) => a - b), out = []
          const pick = (start, left, chosen) => {
            if (left === 0) return void out.push([...chosen])
            for (let i = start; i < nums.length && nums[i] <= left; i++) {
              chosen.push(nums[i])
              pick(i, left - nums[i], chosen)
              chosen.pop()
            }
          }
          pick(0, target, [])
          return out
        }`,
    },
    editorial: { idea: "Sort, then backtrack. Recursing from the same index lets a number repeat; never going back to smaller ones keeps each combination in order and unique. Stop a branch as soon as a number is bigger than what's left.", time: "Exponential in target ÷ smallest candidate", space: "O(target ÷ smallest) for the recursion" },
  },
  {
    slug: "n-queens", title: "N queens", topic: "Recursion", difficulty: "hard",
    statement: "Return in how many ways you can put `n` chess queens on an `n × n` board so that no two attack each other — no two in the same row, column or diagonal.",
    fn: "count_queens", params: ["n"], samples: 2,
    tests: [T(2, 4), T(1, 1), T(0, 2), T(0, 3), T(10, 5), T(4, 6), T(40, 7), T(92, 8)],
    solution: {
      python: code`
        def count_queens(n):
            cols, diag, anti = set(), set(), set()
            def place(row):
                if row == n:
                    return 1
                total = 0
                for c in range(n):
                    if c in cols or row - c in diag or row + c in anti:
                        continue
                    cols.add(c); diag.add(row - c); anti.add(row + c)
                    total += place(row + 1)
                    cols.remove(c); diag.remove(row - c); anti.remove(row + c)
                return total
            return place(0)`,
      javascript: code`
        function countQueens(n) {
          const cols = new Set(), diag = new Set(), anti = new Set()
          const place = (row) => {
            if (row === n) return 1
            let total = 0
            for (let c = 0; c < n; c++) {
              if (cols.has(c) || diag.has(row - c) || anti.has(row + c)) continue
              cols.add(c); diag.add(row - c); anti.add(row + c)
              total += place(row + 1)
              cols.delete(c); diag.delete(row - c); anti.delete(row + c)
            }
            return total
          }
          return place(0)
        }`,
    },
    editorial: { idea: "Place one queen per row. Squares on the same diagonal share row − column, and on the other diagonal row + column, so three sets tell you instantly whether a square is attacked.", time: "Roughly O(n!)", space: "O(n)" },
  },

  // ---------- Sorting and searching ----------
  {
    slug: "evens-before-odds", title: "Evens before odds", topic: "Sorting and searching", difficulty: "easy",
    statement: "Return `nums` rearranged so all even numbers come first, then all odd numbers, each group keeping its original order.",
    fn: "evens_first", params: ["nums"], samples: 2,
    tests: [T([2, 4, 3, 1], [3, 1, 2, 4]), T([0, 2, 1, 3], [0, 1, 2, 3]), T([], []), T([1, 3], [1, 3]), T([2, 4], [2, 4]), T([-2, 6, -1, 5], [-1, -2, 5, 6])],
    solution: {
      python: code`
        def evens_first(nums):
            return [x for x in nums if x % 2 == 0] + [x for x in nums if x % 2 != 0]`,
      javascript: code`
        function evensFirst(nums) {
          return [...nums.filter((x) => x % 2 === 0), ...nums.filter((x) => x % 2 !== 0)]
        }`,
    },
    editorial: { idea: "Two filters — evens, then odds — keep each group in order. (Careful in JavaScript: -1 % 2 is -1, so test for \"not 0\" rather than \"equals 1\".)", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "first-and-last-position", title: "First and last position", topic: "Sorting and searching", difficulty: "medium",
    statement: "`nums` is sorted from smallest to largest. Return `[first, last]` — the first and last positions of `target` — or `[-1, -1]` if it isn't there. Aim for O(log n).",
    fn: "find_range", params: ["nums", "target"], samples: 2,
    tests: [T([3, 4], [5, 7, 7, 8, 8, 10], 8), T([-1, -1], [5, 7, 7, 8, 8, 10], 6), T([-1, -1], [], 0), T([0, 0], [1], 1), T([0, 3], [2, 2, 2, 2], 2), T([1, 1], [1, 2, 3], 2)],
    solution: {
      python: code`
        def find_range(nums, target):
            def first_at_least(x):
                lo, hi = 0, len(nums)
                while lo < hi:
                    mid = (lo + hi) // 2
                    if nums[mid] < x:
                        lo = mid + 1
                    else:
                        hi = mid
                return lo
            start = first_at_least(target)
            if start == len(nums) or nums[start] != target:
                return [-1, -1]
            return [start, first_at_least(target + 1) - 1]`,
      javascript: code`
        function findRange(nums, target) {
          const firstAtLeast = (x) => {
            let lo = 0, hi = nums.length
            while (lo < hi) {
              const mid = (lo + hi) >> 1
              if (nums[mid] < x) lo = mid + 1
              else hi = mid
            }
            return lo
          }
          const start = firstAtLeast(target)
          if (start === nums.length || nums[start] !== target) return [-1, -1]
          return [start, firstAtLeast(target + 1) - 1]
        }`,
    },
    editorial: { idea: "One binary search finds the first position holding at least target. Run it again for target + 1: the last target sits just before that.", time: "O(log n)", space: "O(1)" },
  },
  {
    slug: "minimum-in-rotated-list", title: "Minimum in a rotated list", topic: "Sorting and searching", difficulty: "medium",
    statement: "A sorted list of different numbers was rotated — some items moved from the front to the back, like `[3, 4, 5, 1, 2]`. Return the smallest number in O(log n).",
    fn: "find_min", params: ["nums"], samples: 2,
    tests: [T(1, [3, 4, 5, 1, 2]), T(0, [4, 5, 6, 7, 0, 1, 2]), T(11, [11, 13, 15, 17]), T(1, [2, 1]), T(5, [5]), T(-3, [8, 9, -3, 0, 4])],
    solution: {
      python: code`
        def find_min(nums):
            lo, hi = 0, len(nums) - 1
            while lo < hi:
                mid = (lo + hi) // 2
                if nums[mid] > nums[hi]:
                    lo = mid + 1
                else:
                    hi = mid
            return nums[lo]`,
      javascript: code`
        function findMin(nums) {
          let lo = 0, hi = nums.length - 1
          while (lo < hi) {
            const mid = (lo + hi) >> 1
            if (nums[mid] > nums[hi]) lo = mid + 1
            else hi = mid
          }
          return nums[lo]
        }`,
    },
    editorial: { idea: "Compare the middle with the last item. If the middle is bigger, the drop (and the minimum) is to its right; otherwise it's at the middle or to its left.", time: "O(log n)", space: "O(1)" },
  },
  {
    slug: "h-index", title: "H-index", topic: "Sorting and searching", difficulty: "medium",
    statement: "`citations[i]` is how many times a researcher's paper `i` was cited. Their h-index is the largest `h` such that `h` of their papers have at least `h` citations each. Return it.",
    fn: "h_index", params: ["citations"], samples: 2,
    tests: [T(3, [3, 0, 6, 1, 5]), T(1, [1, 3, 1]), T(0, []), T(0, [0, 0]), T(3, [10, 10, 10]), T(4, [4, 4, 4, 4, 4]), T(1, [100])],
    solution: {
      python: code`
        def h_index(citations):
            h = 0
            for i, c in enumerate(sorted(citations, reverse=True)):
                if c >= i + 1:
                    h = i + 1
            return h`,
      javascript: code`
        function hIndex(citations) {
          const sorted = [...citations].sort((a, b) => b - a)
          let h = 0
          sorted.forEach((c, i) => { if (c >= i + 1) h = i + 1 })
          return h
        }`,
    },
    editorial: { idea: "Sort from most cited down. The paper at position i (counting from 1) proves h ≥ i if it has at least i citations.", time: "O(n log n)", space: "O(n)" },
  },
  {
    slug: "median-of-two-lists", title: "Median of two sorted lists", topic: "Sorting and searching", difficulty: "medium",
    statement: "`a` and `b` are each sorted, and together hold at least one number. Return the median of all the numbers: the middle one, or the average of the two middle ones if the count is even.",
    fn: "median", params: ["a", "b"], samples: 2,
    tests: [T(2, [1, 3], [2]), T(2.5, [1, 2], [3, 4]), T(1, [], [1]), T(0, [0, 0], [0, 0]), T(2, [1, 2, 3], []), T(2.5, [2], [1, 3, 4]), T(-1, [-5, 3], [-1])],
    solution: {
      python: code`
        def median(a, b):
            merged, i, j = [], 0, 0
            while i < len(a) or j < len(b):
                if j == len(b) or (i < len(a) and a[i] <= b[j]):
                    merged.append(a[i]); i += 1
                else:
                    merged.append(b[j]); j += 1
            n = len(merged)
            return merged[n // 2] if n % 2 else (merged[n // 2 - 1] + merged[n // 2]) / 2`,
      javascript: code`
        function median(a, b) {
          const merged = []
          let i = 0, j = 0
          while (i < a.length || j < b.length) {
            if (j === b.length || (i < a.length && a[i] <= b[j])) merged.push(a[i++])
            else merged.push(b[j++])
          }
          const n = merged.length
          return n % 2 ? merged[n >> 1] : (merged[n / 2 - 1] + merged[n / 2]) / 2
        }`,
    },
    editorial: { idea: "Merge the two sorted lists like the merge step of merge sort (no need to sort again), then read the middle. A binary search can do it in O(log n), but merging is the clear first answer.", time: "O(n + m)", space: "O(n + m)" },
  },
  {
    slug: "search-rotated-list", title: "Search a rotated list", topic: "Sorting and searching", difficulty: "hard",
    statement: "A sorted list of different numbers was rotated, like `[4, 5, 6, 7, 0, 1, 2]`. Return the position of `target`, or `-1` if it isn't there — in O(log n).",
    fn: "search_rotated", params: ["nums", "target"], samples: 2,
    tests: [T(4, [4, 5, 6, 7, 0, 1, 2], 0), T(-1, [4, 5, 6, 7, 0, 1, 2], 3), T(-1, [1], 0), T(0, [1], 1), T(1, [3, 1], 1), T(0, [6, 7, 1, 2, 3, 4, 5], 6), T(6, [6, 7, 1, 2, 3, 4, 5], 5), T(-1, [], 5)],
    solution: {
      python: code`
        def search_rotated(nums, target):
            lo, hi = 0, len(nums) - 1
            while lo <= hi:
                mid = (lo + hi) // 2
                if nums[mid] == target:
                    return mid
                if nums[lo] <= nums[mid]:
                    if nums[lo] <= target < nums[mid]:
                        hi = mid - 1
                    else:
                        lo = mid + 1
                else:
                    if nums[mid] < target <= nums[hi]:
                        lo = mid + 1
                    else:
                        hi = mid - 1
            return -1`,
      javascript: code`
        function searchRotated(nums, target) {
          let lo = 0, hi = nums.length - 1
          while (lo <= hi) {
            const mid = (lo + hi) >> 1
            if (nums[mid] === target) return mid
            if (nums[lo] <= nums[mid]) {
              if (nums[lo] <= target && target < nums[mid]) hi = mid - 1
              else lo = mid + 1
            } else {
              if (nums[mid] < target && target <= nums[hi]) lo = mid + 1
              else hi = mid - 1
            }
          }
          return -1
        }`,
    },
    editorial: { idea: "Binary search, but first ask which half is sorted (compare the ends with the middle). If target lies inside the sorted half's range, search there; otherwise search the other half.", time: "O(log n)", space: "O(1)" },
  },
  {
    slug: "meeting-rooms-needed", title: "Meeting rooms needed", topic: "Sorting and searching", difficulty: "hard",
    statement: "Each meeting is `[start, end]`. A meeting that ends at 10 frees its room for one starting at 10. Return the fewest rooms needed to hold all the meetings.",
    fn: "rooms_needed", params: ["meetings"], samples: 2,
    tests: [T(2, [[0, 30], [5, 10], [15, 20]]), T(1, [[7, 10], [2, 4]]), T(0, []), T(1, [[1, 5], [5, 8]]), T(3, [[1, 10], [2, 9], [3, 8]]), T(3, [[1, 4], [2, 5], [6, 7], [3, 6]]), T(2, [[9, 10], [4, 9], [4, 17]])],
    solution: {
      python: code`
        def rooms_needed(meetings):
            starts = sorted(m[0] for m in meetings)
            ends = sorted(m[1] for m in meetings)
            rooms = best = j = 0
            for s in starts:
                while ends[j] <= s:
                    j += 1
                    rooms -= 1
                rooms += 1
                best = max(best, rooms)
            return best`,
      javascript: code`
        function roomsNeeded(meetings) {
          const starts = meetings.map((m) => m[0]).sort((a, b) => a - b)
          const ends = meetings.map((m) => m[1]).sort((a, b) => a - b)
          let rooms = 0, best = 0, j = 0
          for (const s of starts) {
            while (ends[j] <= s) { j++; rooms-- }
            rooms++
            best = Math.max(best, rooms)
          }
          return best
        }`,
    },
    editorial: { idea: "Only the times matter, not which meeting is which. Sort starts and ends separately; at each start, first free every room whose meeting has ended, then take one. The most rooms in use at once is the answer.", time: "O(n log n)", space: "O(n)" },
  },

  // ---------- Stacks and queues ----------
  {
    slug: "remove-adjacent-duplicates", title: "Remove adjacent pairs", topic: "Stacks and queues", difficulty: "easy",
    statement: "Repeatedly remove two equal letters standing next to each other until none are left, and return what remains. `\"abbaca\"` → `\"aaca\"` → `\"ca\"`.",
    fn: "remove_pairs", params: ["s"], samples: 2,
    tests: [T("ca", "abbaca"), T("ay", "azxxzy"), T("", ""), T("", "aa"), T("abc", "abc"), T("", "abccba"), T("a", "aaa")],
    solution: {
      python: code`
        def remove_pairs(s):
            stack = []
            for ch in s:
                if stack and stack[-1] == ch:
                    stack.pop()
                else:
                    stack.append(ch)
            return "".join(stack)`,
      javascript: code`
        function removePairs(s) {
          const stack = []
          for (const ch of s) {
            if (stack.length && stack[stack.length - 1] === ch) stack.pop()
            else stack.push(ch)
          }
          return stack.join("")
        }`,
    },
    editorial: { idea: "A stack: push each letter, but if it matches the top, pop instead. Removing one pair can bring a new pair together, and the stack handles that for free.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "reverse-polish-notation", title: "Reverse Polish calculator", topic: "Stacks and queues", difficulty: "medium",
    statement:
      "Evaluate an expression in reverse Polish notation, where each operator comes after its two numbers: `[\"2\", \"1\", \"+\", \"3\", \"*\"]` means (2 + 1) × 3 = 9. Tokens are whole numbers or `+ - * /`. Division keeps only the whole-number part, rounding towards zero (7 / -2 is -3).",
    fn: "eval_rpn", params: ["tokens"], samples: 2,
    tests: [T(9, ["2", "1", "+", "3", "*"]), T(6, ["4", "13", "5", "/", "+"]), T(7, ["7"]), T(-12, ["3", "-4", "*"]), T(-3, ["7", "-2", "/"]), T(22, ["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]), T(-4, ["1", "5", "-"])],
    solution: {
      python: code`
        def eval_rpn(tokens):
            stack = []
            for t in tokens:
                if t in ("+", "-", "*", "/"):
                    b, a = stack.pop(), stack.pop()
                    if t == "+": stack.append(a + b)
                    elif t == "-": stack.append(a - b)
                    elif t == "*": stack.append(a * b)
                    else: stack.append(int(a / b))
                else:
                    stack.append(int(t))
            return stack[0]`,
      javascript: code`
        function evalRpn(tokens) {
          const stack = []
          for (const t of tokens) {
            if ("+-*/".includes(t) && t.length === 1) {
              const b = stack.pop(), a = stack.pop()
              stack.push(t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : Math.trunc(a / b))
            } else stack.push(Number(t))
          }
          return stack[0]
        }`,
    },
    editorial: { idea: "Push numbers. An operator pops the last two (the second pop is the left-hand number), applies itself and pushes the result. Python's // rounds down, not towards zero — use int(a / b).", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "backspace-compare", title: "Compare with backspaces", topic: "Stacks and queues", difficulty: "medium",
    statement: "In `a` and `b`, `#` means a backspace that deletes the character before it (if there is one). Return `True` (JavaScript: `true`) if both end up as the same text.",
    fn: "same_after_backspace", params: ["a", "b"], samples: 2,
    tests: [T(true, "ab#c", "ad#c"), T(true, "ab##", "c#d#"), T(false, "a#c", "b"), T(true, "", "#"), T(true, "xy#z", "xzz#"), T(false, "a##b", "ab"), T(true, "###", "")],
    solution: {
      python: code`
        def same_after_backspace(a, b):
            def typed(s):
                out = []
                for ch in s:
                    if ch == "#":
                        if out:
                            out.pop()
                    else:
                        out.append(ch)
                return out
            return typed(a) == typed(b)`,
      javascript: code`
        function sameAfterBackspace(a, b) {
          const typed = (s) => {
            const out = []
            for (const ch of s) ch === "#" ? out.pop() : out.push(ch)
            return out.join("")
          }
          return typed(a) === typed(b)
        }`,
    },
    editorial: { idea: "Type each string into a stack, popping on #. (To use no extra space, walk both strings from the end, skipping characters that a later # deletes.)", time: "O(n + m)", space: "O(n + m)" },
  },
  {
    slug: "daily-temperatures", title: "Days until warmer", topic: "Stacks and queues", difficulty: "medium",
    statement: "`temps[i]` is the temperature on day `i`. For each day, return how many days you'd wait for a warmer one, or 0 if no warmer day comes.",
    fn: "days_until_warmer", params: ["temps"], samples: 2,
    tests: [T([1, 1, 4, 2, 1, 1, 0, 0], [33, 34, 35, 31, 29, 32, 36, 33]), T([1, 1, 1, 0], [30, 40, 50, 60]), T([1, 1, 0], [30, 60, 90]), T([], []), T([0, 0], [25, 25]), T([0, 0, 0], [40, 35, 30])],
    solution: {
      python: code`
        def days_until_warmer(temps):
            out = [0] * len(temps)
            waiting = []
            for i, t in enumerate(temps):
                while waiting and temps[waiting[-1]] < t:
                    j = waiting.pop()
                    out[j] = i - j
                waiting.append(i)
            return out`,
      javascript: code`
        function daysUntilWarmer(temps) {
          const out = Array(temps.length).fill(0), waiting = []
          temps.forEach((t, i) => {
            while (waiting.length && temps[waiting[waiting.length - 1]] < t) {
              const j = waiting.pop()
              out[j] = i - j
            }
            waiting.push(i)
          })
          return out
        }`,
    },
    editorial: { idea: "A \"monotonic stack\" of days still waiting, coldest on top. Each new day settles every waiting day that's colder than it. Each day is pushed and popped once.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "next-greater-element", title: "Next greater element", topic: "Stacks and queues", difficulty: "medium",
    statement: "For each number in `nums`, return the first number to its right that is bigger, or `-1` if there is none.",
    fn: "next_greater", params: ["nums"], samples: 2,
    tests: [T([5, 25, 25, -1], [4, 5, 2, 25]), T([-1, 12, 12, -1], [13, 7, 6, 12]), T([], []), T([2, 3, -1], [1, 2, 3]), T([-1, -1, -1], [3, 2, 1]), T([-1, -1], [4, 4])],
    solution: {
      python: code`
        def next_greater(nums):
            out = [-1] * len(nums)
            waiting = []
            for i, x in enumerate(nums):
                while waiting and nums[waiting[-1]] < x:
                    out[waiting.pop()] = x
                waiting.append(i)
            return out`,
      javascript: code`
        function nextGreater(nums) {
          const out = Array(nums.length).fill(-1), waiting = []
          nums.forEach((x, i) => {
            while (waiting.length && nums[waiting[waiting.length - 1]] < x) out[waiting.pop()] = x
            waiting.push(i)
          })
          return out
        }`,
    },
    editorial: { idea: "Keep a stack of positions still waiting for a bigger number. Each new number answers everything smaller on top of the stack.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "simplify-path", title: "Simplify a folder path", topic: "Stacks and queues", difficulty: "medium",
    statement:
      "Simplify a Unix-style absolute `path`. `.` means the current folder, `..` means the parent (at the top it stays at the top), and several `/` in a row count as one. Return the result starting with one `/`, with single `/` between folders and none at the end.",
    fn: "simplify_path", params: ["path"], samples: 3,
    tests: [T("/home", "/home/"), T("/", "/../"), T("/home/foo", "/home//foo/"), T("/c", "/a/./b/../../c/"), T("/c", "/a/../../b/../c//.//"), T("/", "/"), T("/...", "/.../"), T("/a/b", "/a/b/c/..")],
    solution: {
      python: code`
        def simplify_path(path):
            stack = []
            for part in path.split("/"):
                if part == "..":
                    if stack:
                        stack.pop()
                elif part and part != ".":
                    stack.append(part)
            return "/" + "/".join(stack)`,
      javascript: code`
        function simplifyPath(path) {
          const stack = []
          for (const part of path.split("/")) {
            if (part === "..") stack.pop()
            else if (part && part !== ".") stack.push(part)
          }
          return "/" + stack.join("/")
        }`,
    },
    editorial: { idea: "Split on /. Push folder names, pop on .., skip empty pieces and . — then join what's left.", time: "O(n)", space: "O(n)" },
  },
  {
    slug: "decode-string", title: "Decode a string", topic: "Stacks and queues", difficulty: "hard",
    statement: "Decode `s`, where `k[text]` means `text` repeated `k` times, and brackets can be nested: `\"3[a2[c]]\"` → `\"accaccacc\"`. Letters outside brackets stay as they are.",
    fn: "decode_string", params: ["s"], samples: 2,
    tests: [T("aaabcbc", "3[a]2[bc]"), T("accaccacc", "3[a2[c]]"), T("abcabccdcdcdef", "2[abc]3[cd]ef"), T("abc", "abc"), T("", ""), T("x".repeat(10), "10[x]"), T("zabababz", "z3[ab]z")],
    solution: {
      python: code`
        def decode_string(s):
            stack, text, count = [], "", 0
            for ch in s:
                if ch.isdigit():
                    count = count * 10 + int(ch)
                elif ch == "[":
                    stack.append((text, count))
                    text, count = "", 0
                elif ch == "]":
                    before, k = stack.pop()
                    text = before + text * k
                else:
                    text += ch
            return text`,
      javascript: code`
        function decodeString(s) {
          const stack = []
          let text = "", count = 0
          for (const ch of s) {
            if (ch >= "0" && ch <= "9") count = count * 10 + Number(ch)
            else if (ch === "[") { stack.push([text, count]); text = ""; count = 0 }
            else if (ch === "]") { const [before, k] = stack.pop(); text = before + text.repeat(k) }
            else text += ch
          }
          return text
        }`,
    },
    editorial: { idea: "On [, save the text so far and the repeat count on a stack and start fresh. On ], repeat the inner text and glue it after the saved text. Nesting just means more on the stack.", time: "O(length of the answer)", space: "O(length of the answer)" },
  },
  {
    slug: "largest-rectangle-in-histogram", title: "Largest rectangle in a histogram", topic: "Stacks and queues", difficulty: "hard",
    statement: "`heights` are the bars of a histogram, each 1 wide. Return the area of the largest rectangle that fits inside the bars.",
    fn: "largest_rectangle", params: ["heights"], samples: 2,
    tests: [T(10, [2, 1, 5, 6, 2, 3]), T(4, [2, 4]), T(0, []), T(5, [5]), T(4, [1, 1, 1, 1]), T(12, [6, 2, 5, 4, 5, 1, 6]), T(9, [1, 2, 3, 4, 5])],
    solution: {
      python: code`
        def largest_rectangle(heights):
            stack, best = [], 0
            for i, h in enumerate(heights + [0]):
                while stack and heights[stack[-1]] >= h:
                    top = stack.pop()
                    left = stack[-1] + 1 if stack else 0
                    best = max(best, heights[top] * (i - left))
                stack.append(i)
            return best`,
      javascript: code`
        function largestRectangle(heights) {
          const stack = []
          let best = 0
          for (let i = 0; i <= heights.length; i++) {
            const h = i === heights.length ? 0 : heights[i]
            while (stack.length && heights[stack[stack.length - 1]] >= h) {
              const top = stack.pop()
              const left = stack.length ? stack[stack.length - 1] + 1 : 0
              best = Math.max(best, heights[top] * (i - left))
            }
            stack.push(i)
          }
          return best
        }`,
    },
    editorial: { idea: "For each bar, the widest rectangle of its height stretches until a shorter bar on each side. A stack of increasing heights finds both: when a shorter bar arrives, it's the right edge of every taller bar it pops, and the bar below in the stack is the left edge.", time: "O(n)", space: "O(n)" },
  },

  // ---------- Grids ----------
  {
    slug: "matrix-diagonal-sum", title: "Diagonal sum", topic: "Grids", difficulty: "easy",
    statement: "Return the sum of both diagonals of the square `grid`. If the grid has a centre cell, count it once.",
    fn: "diagonal_sum", params: ["grid"], samples: 2,
    tests: [T(25, [[1, 2, 3], [4, 5, 6], [7, 8, 9]]), T(8, [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]]), T(5, [[5]]), T(10, [[1, 2], [3, 4]]), T(0, [])],
    solution: {
      python: code`
        def diagonal_sum(grid):
            n = len(grid)
            total = sum(grid[i][i] + grid[i][n - 1 - i] for i in range(n))
            return total - grid[n // 2][n // 2] if n % 2 else total`,
      javascript: code`
        function diagonalSum(grid) {
          const n = grid.length
          let total = 0
          for (let i = 0; i < n; i++) total += grid[i][i] + grid[i][n - 1 - i]
          return n % 2 ? total - grid[n >> 1][n >> 1] : total
        }`,
    },
    editorial: { idea: "Row i has its two diagonal cells at columns i and n − 1 − i. When n is odd they meet in the middle row, so subtract the centre once.", time: "O(n)", space: "O(1)" },
  },
  {
    slug: "rotate-a-grid", title: "Rotate a grid", topic: "Grids", difficulty: "medium",
    statement: "Return `grid` turned 90° clockwise. The grid has at least one row and may not be square.",
    fn: "rotate_grid", params: ["grid"], samples: 2,
    tests: [T([[7, 4, 1], [8, 5, 2], [9, 6, 3]], [[1, 2, 3], [4, 5, 6], [7, 8, 9]]), T([[4, 1], [5, 2], [6, 3]], [[1, 2, 3], [4, 5, 6]]), T([[1]], [[1]]), T([[3, 1], [4, 2]], [[1, 2], [3, 4]]), T([[3, 2, 1]], [[1], [2], [3]])],
    solution: {
      python: code`
        def rotate_grid(grid):
            return [list(row) for row in zip(*grid[::-1])]`,
      javascript: code`
        function rotateGrid(grid) {
          const rows = grid.length, cols = grid[0].length
          return Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (_, r) => grid[rows - 1 - r][c]))
        }`,
    },
    editorial: { idea: "Column c of the original, read from the bottom up, becomes row c of the answer. (Equivalently: flip the rows upside down, then transpose.)", time: "O(rows × columns)", space: "O(rows × columns)" },
  },
  {
    slug: "flood-fill", title: "Flood fill", topic: "Grids", difficulty: "medium",
    statement: "Like a paint bucket: change the cell at `row`, `col` to `color`, along with every cell connected to it (up, down, left, right) that had the same original colour. Return the new grid.",
    fn: "flood_fill", params: ["grid", "row", "col", "color"], samples: 2,
    tests: [
      T([[2, 2, 2], [2, 2, 0], [2, 0, 1]], [[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2), T([[0, 0, 0], [0, 0, 0]], [[0, 0, 0], [0, 0, 0]], 0, 0, 0), T([[0, 0, 0], [0, 1, 1]], [[0, 0, 0], [0, 1, 1]], 1, 1, 1),
      T([[5]], [[1]], 0, 0, 5), T([[3, 2], [2, 1]], [[1, 2], [2, 1]], 0, 0, 3), T([[1, 9, 9], [1, 1, 9], [0, 1, 1]], [[1, 0, 0], [1, 1, 0], [0, 1, 1]], 0, 2, 9),
    ],
    solution: {
      python: code`
        def flood_fill(grid, row, col, color):
            g = [r[:] for r in grid]
            old = g[row][col]
            if old == color:
                return g
            stack = [(row, col)]
            while stack:
                r, c = stack.pop()
                if 0 <= r < len(g) and 0 <= c < len(g[0]) and g[r][c] == old:
                    g[r][c] = color
                    stack += [(r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)]
            return g`,
      javascript: code`
        function floodFill(grid, row, col, color) {
          const g = grid.map((r) => [...r])
          const old = g[row][col]
          if (old === color) return g
          const stack = [[row, col]]
          while (stack.length) {
            const [r, c] = stack.pop()
            if (r < 0 || r >= g.length || c < 0 || c >= g[0].length || g[r][c] !== old) continue
            g[r][c] = color
            stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1])
          }
          return g
        }`,
    },
    editorial: { idea: "Depth-first search from the start cell, painting as you go. Painted cells no longer match the old colour, so they're never visited twice — unless the new colour is the old one, which is why that case returns early.", time: "O(rows × columns)", space: "O(rows × columns)" },
  },
  {
    slug: "set-grid-zeros", title: "Zero out rows and columns", topic: "Grids", difficulty: "medium",
    statement: "Return a copy of `grid` where every row and every column that contains a 0 is filled with 0s.",
    fn: "zero_rows_cols", params: ["grid"], samples: 2,
    tests: [T([[1, 0, 1], [0, 0, 0], [1, 0, 1]], [[1, 1, 1], [1, 0, 1], [1, 1, 1]]), T([[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]], [[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]), T([[5]], [[5]]), T([[0]], [[0]]), T([[1, 2], [3, 4]], [[1, 2], [3, 4]]), T([[0, 0, 0]], [[1, 0, 3]])],
    solution: {
      python: code`
        def zero_rows_cols(grid):
            rows = {r for r, row in enumerate(grid) for v in row if v == 0}
            cols = {c for row in grid for c, v in enumerate(row) if v == 0}
            return [[0 if r in rows or c in cols else v for c, v in enumerate(row)] for r, row in enumerate(grid)]`,
      javascript: code`
        function zeroRowsCols(grid) {
          const rows = new Set(), cols = new Set()
          grid.forEach((row, r) => row.forEach((v, c) => { if (v === 0) { rows.add(r); cols.add(c) } }))
          return grid.map((row, r) => row.map((v, c) => (rows.has(r) || cols.has(c) ? 0 : v)))
        }`,
    },
    editorial: { idea: "First find every row and column that has a 0, then build the answer. Zeroing while you scan would spread the zeros too far.", time: "O(rows × columns)", space: "O(rows + columns)" },
  },
  {
    slug: "search-a-sorted-grid", title: "Search a sorted grid", topic: "Grids", difficulty: "medium",
    statement: "Each row of `grid` is sorted, and each row starts with a number bigger than the last number of the row before. Return whether `target` is in the grid, in O(log(rows × columns)).",
    fn: "in_grid", params: ["grid", "target"], samples: 2,
    tests: [
      T(true, [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3), T(false, [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13), T(false, [], 1), T(true, [[1]], 1),
      T(true, [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 60), T(false, [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 0), T(true, [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 10),
    ],
    solution: {
      python: code`
        def in_grid(grid, target):
            if not grid:
                return False
            cols = len(grid[0])
            lo, hi = 0, len(grid) * cols - 1
            while lo <= hi:
                mid = (lo + hi) // 2
                v = grid[mid // cols][mid % cols]
                if v == target:
                    return True
                if v < target:
                    lo = mid + 1
                else:
                    hi = mid - 1
            return False`,
      javascript: code`
        function inGrid(grid, target) {
          if (grid.length === 0) return false
          const cols = grid[0].length
          let lo = 0, hi = grid.length * cols - 1
          while (lo <= hi) {
            const mid = (lo + hi) >> 1
            const v = grid[Math.floor(mid / cols)][mid % cols]
            if (v === target) return true
            if (v < target) lo = mid + 1
            else hi = mid - 1
          }
          return false
        }`,
    },
    editorial: { idea: "Read row by row, the grid is one long sorted list. Binary search over positions 0 … rows × cols − 1, turning position p into row p ÷ cols and column p % cols.", time: "O(log(rows × columns))", space: "O(1)" },
  },
  {
    slug: "count-islands", title: "Count the islands", topic: "Grids", difficulty: "medium",
    statement: "In `grid`, 1 is land and 0 is water. An island is land cells joined up, down, left or right. Return how many islands there are.",
    fn: "count_islands", params: ["grid"], samples: 2,
    tests: [
      T(3, [[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 1]]), T(1, [[1, 1, 1], [0, 1, 0], [1, 1, 1]]), T(0, []), T(0, [[0]]), T(5, [[1, 0, 1], [0, 1, 0], [1, 0, 1]]), T(1, [[1]]),
      T(1, Array.from({ length: 30 }, () => Array(30).fill(1))),
    ],
    solution: {
      python: code`
        def count_islands(grid):
            seen = set()
            count = 0
            for r in range(len(grid)):
                for c in range(len(grid[0])):
                    if grid[r][c] == 1 and (r, c) not in seen:
                        count += 1
                        stack = [(r, c)]
                        seen.add((r, c))
                        while stack:
                            y, x = stack.pop()
                            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                                if 0 <= ny < len(grid) and 0 <= nx < len(grid[0]) and grid[ny][nx] == 1 and (ny, nx) not in seen:
                                    seen.add((ny, nx))
                                    stack.append((ny, nx))
            return count`,
      javascript: code`
        function countIslands(grid) {
          const seen = grid.map((row) => row.map(() => false))
          let count = 0
          for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[0].length; c++) {
              if (grid[r][c] !== 1 || seen[r][c]) continue
              count++
              const stack = [[r, c]]
              seen[r][c] = true
              while (stack.length) {
                const [y, x] = stack.pop()
                for (const [ny, nx] of [[y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]]) {
                  if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length && grid[ny][nx] === 1 && !seen[ny][nx]) {
                    seen[ny][nx] = true
                    stack.push([ny, nx])
                  }
                }
              }
            }
          }
          return count
        }`,
    },
    editorial: { idea: "Scan every cell. Unvisited land starts a new island: count it, then visit all of its land with a depth-first search (a stack, so a big island can't overflow recursion) so it isn't counted again.", time: "O(rows × columns)", space: "O(rows × columns)" },
  },

  // ---------- Dynamic programming ----------
  {
    slug: "min-cost-stairs", title: "Cheapest way up the stairs", topic: "Dynamic programming", difficulty: "medium",
    statement: "`cost[i]` is what you pay to step on stair `i`. You can start on stair 0 or 1, and from each stair climb 1 or 2 steps. Return the least you can pay to get past the last stair.",
    fn: "min_cost", params: ["cost"], samples: 2,
    tests: [T(15, [10, 15, 20]), T(6, [1, 100, 1, 1, 1, 100, 1, 1, 100, 1]), T(0, [0, 0]), T(5, [5, 10]), T(3, [3, 2, 4, 1]), T(2, [1, 1, 1, 1])],
    solution: {
      python: code`
        def min_cost(cost):
            a = b = 0  # cheapest way to stand on the stair two below / one below
            for i in range(2, len(cost) + 1):
                a, b = b, min(b + cost[i - 1], a + cost[i - 2])
            return b`,
      javascript: code`
        function minCost(cost) {
          let a = 0, b = 0
          for (let i = 2; i <= cost.length; i++) [a, b] = [b, Math.min(b + cost[i - 1], a + cost[i - 2])]
          return b
        }`,
    },
    editorial: { idea: "The cheapest way to reach step i comes from step i − 1 or i − 2, plus that step's cost. You only ever need the last two answers.", time: "O(n)", space: "O(1)" },
  },
  {
    slug: "house-robber", title: "House robber", topic: "Dynamic programming", difficulty: "medium",
    statement: "Houses along a street hold `money[i]` each. You can't take from two houses next to each other. Return the most you can collect.",
    fn: "rob", params: ["money"], samples: 2,
    tests: [T(4, [1, 2, 3, 1]), T(12, [2, 7, 9, 3, 1]), T(0, []), T(5, [5]), T(4, [2, 1, 1, 2]), T(16, [5, 3, 4, 11, 2])],
    solution: {
      python: code`
        def rob(money):
            skip = take = 0
            for m in money:
                skip, take = max(skip, take), skip + m
            return max(skip, take)`,
      javascript: code`
        function rob(money) {
          let skip = 0, take = 0
          for (const m of money) [skip, take] = [Math.max(skip, take), skip + m]
          return Math.max(skip, take)
        }`,
    },
    editorial: { idea: "At each house, either take it (plus the best total that skipped the previous house) or skip it (the best total so far). Two running numbers are enough.", time: "O(n)", space: "O(1)" },
  },
  {
    slug: "minimum-path-sum", title: "Minimum path sum", topic: "Dynamic programming", difficulty: "medium",
    statement: "Walk from the top-left to the bottom-right of `grid`, moving only right or down. Return the smallest possible sum of the numbers on your path.",
    fn: "min_path_sum", params: ["grid"], samples: 2,
    tests: [T(7, [[1, 3, 1], [1, 5, 1], [4, 2, 1]]), T(12, [[1, 2, 3], [4, 5, 6]]), T(5, [[5]]), T(3, [[1, 2], [1, 1]]), T(6, [[1], [2], [3]]), T(6, [[1, 9, 1, 1], [1, 1, 1, 9], [9, 9, 1, 1]])],
    solution: {
      python: code`
        def min_path_sum(grid):
            cols = len(grid[0])
            best = [float("inf")] * cols
            best[0] = 0
            for row in grid:
                for c in range(cols):
                    left = best[c - 1] if c > 0 else float("inf")
                    best[c] = row[c] + min(best[c], left)
            return best[-1]`,
      javascript: code`
        function minPathSum(grid) {
          const cols = grid[0].length
          const best = Array(cols).fill(Infinity)
          best[0] = 0
          for (const row of grid)
            for (let c = 0; c < cols; c++) best[c] = row[c] + Math.min(best[c], c > 0 ? best[c - 1] : Infinity)
          return best[cols - 1]
        }`,
    },
    editorial: { idea: "The best path into a cell comes from above or from the left. Fill the grid row by row; one row of answers is enough, since the cell above is the old value in the same column.", time: "O(rows × columns)", space: "O(columns)" },
  },
  {
    slug: "longest-increasing-subsequence", title: "Longest increasing subsequence", topic: "Dynamic programming", difficulty: "hard",
    statement: "Return the length of the longest subsequence of `nums` (items kept in order, not necessarily next to each other) that is strictly increasing.",
    fn: "lis_length", params: ["nums"], samples: 2,
    tests: [T(4, [10, 9, 2, 5, 3, 7, 101, 18]), T(4, [0, 1, 0, 3, 2, 3]), T(1, [7, 7, 7]), T(0, []), T(4, [1, 2, 3, 4]), T(1, [4, 3, 2, 1]), T(5, [3, 10, 2, 1, 20, 4, 6, 7, 8, 5])],
    solution: {
      python: code`
        from bisect import bisect_left

        def lis_length(nums):
            tails = []  # tails[k] = smallest last item of an increasing run of length k + 1
            for x in nums:
                i = bisect_left(tails, x)
                if i == len(tails):
                    tails.append(x)
                else:
                    tails[i] = x
            return len(tails)`,
      javascript: code`
        function lisLength(nums) {
          const tails = []
          for (const x of nums) {
            let lo = 0, hi = tails.length
            while (lo < hi) {
              const mid = (lo + hi) >> 1
              if (tails[mid] < x) lo = mid + 1
              else hi = mid
            }
            tails[lo] = x
          }
          return tails.length
        }`,
    },
    editorial: { idea: "The O(n²) way: best[i] = 1 + the best of earlier smaller items. Faster: keep the smallest possible last item for each run length (always sorted), and binary-search where each new number fits.", time: "O(n log n)", space: "O(n)" },
  },
  {
    slug: "edit-distance", title: "Edit distance", topic: "Dynamic programming", difficulty: "hard",
    statement: "Return the fewest single-character edits — insert, delete or replace a character — that turn `a` into `b`.",
    fn: "edit_distance", params: ["a", "b"], samples: 2,
    tests: [T(3, "horse", "ros"), T(5, "intention", "execution"), T(3, "", "abc"), T(0, "abc", "abc"), T(3, "kitten", "sitting"), T(3, "abc", ""), T(1, "flaw", "flow")],
    solution: {
      python: code`
        def edit_distance(a, b):
            prev = list(range(len(b) + 1))
            for i in range(1, len(a) + 1):
                cur = [i] + [0] * len(b)
                for j in range(1, len(b) + 1):
                    if a[i - 1] == b[j - 1]:
                        cur[j] = prev[j - 1]
                    else:
                        cur[j] = 1 + min(prev[j - 1], prev[j], cur[j - 1])
                prev = cur
            return prev[len(b)]`,
      javascript: code`
        function editDistance(a, b) {
          let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
          for (let i = 1; i <= a.length; i++) {
            const cur = [i]
            for (let j = 1; j <= b.length; j++)
              cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1])
            prev = cur
          }
          return prev[b.length]
        }`,
    },
    editorial: { idea: "Let d[i][j] be the edits that turn the first i letters of a into the first j of b. If the last letters match, it's d[i−1][j−1]; otherwise 1 + the best of replace (d[i−1][j−1]), delete (d[i−1][j]) and insert (d[i][j−1]). Keep one row at a time.", time: "O(n × m)", space: "O(m)" },
  },
  {
    slug: "longest-common-subsequence", title: "Longest common subsequence", topic: "Dynamic programming", difficulty: "hard",
    statement: "Return the length of the longest sequence of characters that appears, in order (not necessarily next to each other), in both `a` and `b`.",
    fn: "lcs_length", params: ["a", "b"], samples: 2,
    tests: [T(3, "abcde", "ace"), T(3, "abc", "abc"), T(0, "abc", "def"), T(0, "", "a"), T(4, "AGGTAB", "GXTXAYB"), T(2, "abcba", "ba")],
    solution: {
      python: code`
        def lcs_length(a, b):
            prev = [0] * (len(b) + 1)
            for ch in a:
                cur = [0]
                for j in range(1, len(b) + 1):
                    cur.append(prev[j - 1] + 1 if ch == b[j - 1] else max(prev[j], cur[j - 1]))
                prev = cur
            return prev[len(b)]`,
      javascript: code`
        function lcsLength(a, b) {
          let prev = Array(b.length + 1).fill(0)
          for (const ch of a) {
            const cur = [0]
            for (let j = 1; j <= b.length; j++) cur[j] = ch === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1])
            prev = cur
          }
          return prev[b.length]
        }`,
    },
    editorial: { idea: "L[i][j] is the answer for the first i letters of a and first j of b. Matching last letters add 1 to L[i−1][j−1]; otherwise drop a letter from one side: max(L[i−1][j], L[i][j−1]).", time: "O(n × m)", space: "O(m)" },
  },
  {
    slug: "decode-ways", title: "Decode ways", topic: "Dynamic programming", difficulty: "hard",
    statement: "A message of letters was encoded as numbers: A → 1, B → 2, … Z → 26, then joined into `s`. Return how many different messages `s` could be. A code never starts with 0, so `\"06\"` can't be read at all.",
    fn: "decode_ways", params: ["s"], samples: 2,
    tests: [T(2, "12"), T(3, "226"), T(0, "0"), T(0, "06"), T(2, "11106"), T(1, "1"), T(1, "27"), T(1, "10"), T(0, "100"), T(89, "1111111111")],
    solution: {
      python: code`
        def decode_ways(s):
            if not s:
                return 0
            two_back, one_back = 1, 1 if s[0] != "0" else 0
            for i in range(1, len(s)):
                cur = one_back if s[i] != "0" else 0
                if 10 <= int(s[i - 1:i + 1]) <= 26:
                    cur += two_back
                two_back, one_back = one_back, cur
            return one_back`,
      javascript: code`
        function decodeWays(s) {
          if (!s) return 0
          let twoBack = 1, oneBack = s[0] !== "0" ? 1 : 0
          for (let i = 1; i < s.length; i++) {
            let cur = s[i] !== "0" ? oneBack : 0
            const pair = Number(s.slice(i - 1, i + 1))
            if (pair >= 10 && pair <= 26) cur += twoBack
            ;[twoBack, oneBack] = [oneBack, cur]
          }
          return oneBack
        }`,
    },
    editorial: { idea: "Ways to read the first i digits = (ways for i − 1, if digit i alone is 1–9) + (ways for i − 2, if the last two digits make 10–26). Like climbing stairs, with rules about which steps are allowed.", time: "O(n)", space: "O(1)" },
  },
  {
    slug: "knapsack", title: "Knapsack", topic: "Dynamic programming", difficulty: "hard",
    statement: "Item `i` weighs `weights[i]` and is worth `values[i]`. Your bag holds a total weight of at most `capacity`, and each item can be taken once. Return the most value you can carry.",
    fn: "knapsack", params: ["weights", "values", "capacity"], samples: 2,
    tests: [T(9, [1, 3, 4, 5], [1, 4, 5, 7], 7), T(90, [5, 4, 6, 3], [10, 40, 30, 50], 10), T(0, [10], [5], 5), T(0, [], [], 10), T(22, [1, 2, 3], [6, 10, 12], 5), T(0, [1, 2], [3, 4], 0)],
    solution: {
      python: code`
        def knapsack(weights, values, capacity):
            best = [0] * (capacity + 1)
            for w, v in zip(weights, values):
                for c in range(capacity, w - 1, -1):
                    best[c] = max(best[c], best[c - w] + v)
            return best[capacity]`,
      javascript: code`
        function knapsack(weights, values, capacity) {
          const best = Array(capacity + 1).fill(0)
          weights.forEach((w, i) => {
            for (let c = capacity; c >= w; c--) best[c] = Math.max(best[c], best[c - w] + values[i])
          })
          return best[capacity]
        }`,
    },
    editorial: { idea: "best[c] is the most value within weight c. For each item, update capacities from high to low, so the item isn't used twice in the same round.", time: "O(items × capacity)", space: "O(capacity)" },
  },
  {
    slug: "partition-equal-sums", title: "Split into equal sums", topic: "Dynamic programming", difficulty: "hard",
    statement: "Can the positive numbers in `nums` be split into two groups with the same total? Every number goes into exactly one group, and `nums` has at least one number.",
    fn: "can_partition", params: ["nums"], samples: 2,
    tests: [T(true, [1, 5, 11, 5]), T(false, [1, 2, 3, 5]), T(true, [2, 2]), T(false, [1]), T(true, [3, 3, 3, 4, 5]), T(false, [100, 1, 1]), T(true, range(40, (i) => i + 1))],
    solution: {
      python: code`
        def can_partition(nums):
            total = sum(nums)
            if total % 2:
                return False
            reachable = {0}
            for x in nums:
                reachable |= {s + x for s in reachable if s + x <= total // 2}
            return total // 2 in reachable`,
      javascript: code`
        function canPartition(nums) {
          const total = nums.reduce((a, b) => a + b, 0)
          if (total % 2) return false
          const half = total / 2
          const ok = Array(half + 1).fill(false)
          ok[0] = true
          for (const x of nums) for (let s = half; s >= x; s--) ok[s] = ok[s] || ok[s - x]
          return ok[half]
        }`,
    },
    editorial: { idea: "An odd total can't split. Otherwise ask: can some group add up to exactly half? Track which sums are reachable using the numbers so far — a knapsack with only weights.", time: "O(n × total)", space: "O(total)" },
  },
  {
    slug: "maximum-product-subarray", title: "Maximum product slice", topic: "Dynamic programming", difficulty: "hard",
    statement: "Return the largest product of a contiguous, non-empty slice of `nums`. Numbers can be negative or zero.",
    fn: "max_product", params: ["nums"], samples: 2,
    tests: [T(6, [2, 3, -2, 4]), T(0, [-2, 0, -1]), T(-2, [-2]), T(24, [-2, 3, -4]), T(2, [0, 2]), T(24, [2, -5, -2, -4, 3]), T(4, [-1, -2, -2])],
    solution: {
      python: code`
        def max_product(nums):
            best = hi = lo = nums[0]
            for x in nums[1:]:
                hi, lo = max(x, hi * x, lo * x), min(x, hi * x, lo * x)
                best = max(best, hi)
            return best`,
      javascript: code`
        function maxProduct(nums) {
          let best = nums[0], hi = nums[0], lo = nums[0]
          for (const x of nums.slice(1)) {
            ;[hi, lo] = [Math.max(x, hi * x, lo * x), Math.min(x, hi * x, lo * x)]
            best = Math.max(best, hi)
          }
          return best
        }`,
    },
    editorial: { idea: "Like the maximum-sum slice, but a negative number turns the smallest product into the biggest. So track both the largest and the smallest product of a slice ending here.", time: "O(n)", space: "O(1)" },
  },
]
