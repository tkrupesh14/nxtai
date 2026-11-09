import "server-only"

// Krpex Code problem bank (5.4 C). Hand-written; tests/unit/code-problems.test.ts runs every reference solution
// against its tests in Python and JavaScript. Problem rows (slug, difficulty, test count) are mirrored in
// migration 028 (coding_problems), which awards XP; tests/db/coding.test.ts checks the two agree.
// Solutions never leave the server: pages pass learners publicProblem(), without them.

import { META, type Tag } from "@/lib/code/meta"

export type Difficulty = "easy" | "medium" | "hard"
export type TestCase = { args: unknown[]; expected: unknown }

export type Problem = {
  slug: string
  title: string
  topic: Topic
  difficulty: Difficulty
  /** Markdown. Examples are added from the first `samples` tests. */
  statement: string
  /** Python name, snake_case. JavaScript uses camelCase (twoSum). */
  fn: string
  params: string[]
  tests: TestCase[]
  /** How many tests are shown as examples (the rest are hidden). */
  samples: number
  /** The answer is a list whose order doesn't matter. */
  unordered?: boolean
  solution: { python: string; javascript: string }
}

export const TOPICS = ["Basics", "Strings", "Lists", "Dictionaries", "Maths and loops", "Recursion", "Sorting and searching", "Problem solving"] as const
export type Topic = (typeof TOPICS)[number]

export { XP_FOR } from "@/lib/code/xp"

const T = (expected: unknown, ...args: unknown[]): TestCase => ({ args, expected })

export const PROBLEMS: Problem[] = [
  // ---------- Basics ----------
  {
    slug: "add-two-numbers", title: "Add two numbers", topic: "Basics", difficulty: "easy",
    statement: "Return the sum of `a` and `b`.",
    fn: "add", params: ["a", "b"], samples: 2,
    tests: [T(5, 2, 3), T(0, -4, 4), T(1000000, 999999, 1), T(-7, -3, -4), T(0, 0, 0)],
    solution: { python: "def add(a, b):\n    return a + b", javascript: "function add(a, b) {\n  return a + b\n}" },
  },
  {
    slug: "even-or-odd", title: "Even or odd", topic: "Basics", difficulty: "easy",
    statement: "Return `True` (JavaScript: `true`) if the whole number `n` is even, otherwise `False`.",
    fn: "is_even", params: ["n"], samples: 2,
    tests: [T(true, 4), T(false, 7), T(true, 0), T(false, -3), T(true, -10), T(false, 1000001)],
    solution: { python: "def is_even(n):\n    return n % 2 == 0", javascript: "function isEven(n) {\n  return n % 2 === 0\n}" },
  },
  {
    slug: "largest-of-three", title: "Largest of three", topic: "Basics", difficulty: "easy",
    statement: "Return the largest of the three numbers `a`, `b` and `c`.",
    fn: "largest_of_three", params: ["a", "b", "c"], samples: 2,
    tests: [T(9, 3, 9, 4), T(5, 5, 5, 5), T(-1, -1, -2, -3), T(12, 12, 7, 11), T(8, 1, 2, 8)],
    solution: {
      python: "def largest_of_three(a, b, c):\n    return max(a, b, c)",
      javascript: "function largestOfThree(a, b, c) {\n  return Math.max(a, b, c)\n}",
    },
  },
  {
    slug: "celsius-to-fahrenheit", title: "Celsius to Fahrenheit", topic: "Basics", difficulty: "easy",
    statement: "Convert a temperature from Celsius to Fahrenheit: `F = C × 9 / 5 + 32`.",
    fn: "to_fahrenheit", params: ["celsius"], samples: 2,
    tests: [T(212, 100), T(32, 0), T(98.6, 37), T(-40, -40), T(77, 25)],
    solution: {
      python: "def to_fahrenheit(celsius):\n    return celsius * 9 / 5 + 32",
      javascript: "function toFahrenheit(celsius) {\n  return (celsius * 9) / 5 + 32\n}",
    },
  },
  {
    slug: "exam-grade", title: "Exam grade", topic: "Basics", difficulty: "easy",
    statement: "Return the grade for `marks` out of 100: `\"A\"` for 90 and above, `\"B\"` for 75–89, `\"C\"` for 50–74 and `\"F\"` below 50.",
    fn: "grade", params: ["marks"], samples: 3,
    tests: [T("A", 95), T("C", 62), T("F", 12), T("A", 90), T("B", 89), T("B", 75), T("C", 50), T("F", 49), T("A", 100), T("F", 0)],
    solution: {
      python: 'def grade(marks):\n    if marks >= 90:\n        return "A"\n    if marks >= 75:\n        return "B"\n    if marks >= 50:\n        return "C"\n    return "F"',
      javascript: 'function grade(marks) {\n  if (marks >= 90) return "A"\n  if (marks >= 75) return "B"\n  if (marks >= 50) return "C"\n  return "F"\n}',
    },
  },
  {
    slug: "leap-year", title: "Leap year", topic: "Basics", difficulty: "easy",
    statement: "A year is a leap year if it divides by 4, except years that divide by 100 — unless they also divide by 400. Return whether `year` is a leap year.",
    fn: "is_leap_year", params: ["year"], samples: 2,
    tests: [T(true, 2024), T(false, 2023), T(false, 1900), T(true, 2000), T(false, 2100), T(true, 1996)],
    solution: {
      python: "def is_leap_year(year):\n    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)",
      javascript: "function isLeapYear(year) {\n  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)\n}",
    },
  },
  {
    slug: "fizzbuzz", title: "FizzBuzz", topic: "Basics", difficulty: "easy",
    statement: "Return a list of strings for the numbers 1 to `n`: `\"Fizz\"` for multiples of 3, `\"Buzz\"` for multiples of 5, `\"FizzBuzz\"` for multiples of both, and the number itself (as a string) otherwise.",
    fn: "fizz_buzz", params: ["n"], samples: 1,
    tests: [
      T(["1", "2", "Fizz", "4", "Buzz"], 5),
      T(["1"], 1),
      T(["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"], 15),
      T([], 0),
    ],
    solution: {
      python: 'def fizz_buzz(n):\n    out = []\n    for i in range(1, n + 1):\n        if i % 15 == 0:\n            out.append("FizzBuzz")\n        elif i % 3 == 0:\n            out.append("Fizz")\n        elif i % 5 == 0:\n            out.append("Buzz")\n        else:\n            out.append(str(i))\n    return out',
      javascript: 'function fizzBuzz(n) {\n  const out = []\n  for (let i = 1; i <= n; i++) {\n    if (i % 15 === 0) out.push("FizzBuzz")\n    else if (i % 3 === 0) out.push("Fizz")\n    else if (i % 5 === 0) out.push("Buzz")\n    else out.push(String(i))\n  }\n  return out\n}',
    },
  },
  {
    slug: "sum-to-n", title: "Sum from 1 to n", topic: "Basics", difficulty: "easy",
    statement: "Return 1 + 2 + … + `n`. For `n` of 0 the answer is 0.",
    fn: "sum_to", params: ["n"], samples: 2,
    tests: [T(15, 5), T(1, 1), T(0, 0), T(5050, 100), T(500500, 1000)],
    solution: {
      python: "def sum_to(n):\n    return n * (n + 1) // 2",
      javascript: "function sumTo(n) {\n  return (n * (n + 1)) / 2\n}",
    },
  },
  {
    slug: "factorial", title: "Factorial", topic: "Basics", difficulty: "easy",
    statement: "Return `n!` = 1 × 2 × … × `n`. By definition `0!` is 1.",
    fn: "factorial", params: ["n"], samples: 2,
    tests: [T(120, 5), T(1, 0), T(1, 1), T(3628800, 10), T(6, 3)],
    solution: {
      python: "def factorial(n):\n    result = 1\n    for i in range(2, n + 1):\n        result *= i\n    return result",
      javascript: "function factorial(n) {\n  let result = 1\n  for (let i = 2; i <= n; i++) result *= i\n  return result\n}",
    },
  },
  {
    slug: "count-digits", title: "Count the digits", topic: "Basics", difficulty: "easy",
    statement: "Return how many digits the whole number `n` has (ignore a minus sign). 0 has one digit.",
    fn: "count_digits", params: ["n"], samples: 2,
    tests: [T(5, 12345), T(1, 0), T(1, 7), T(3, -905), T(7, 1000000)],
    solution: {
      python: "def count_digits(n):\n    return len(str(abs(n)))",
      javascript: "function countDigits(n) {\n  return String(Math.abs(n)).length\n}",
    },
  },

  // ---------- Strings ----------
  {
    slug: "reverse-a-string", title: "Reverse a string", topic: "Strings", difficulty: "easy",
    statement: "Return the string `s` backwards.",
    fn: "reverse_string", params: ["s"], samples: 2,
    tests: [T("olleh", "hello"), T("", ""), T("a", "a"), T("racecar", "racecar"), T("4321 ,ihleD", "Delhi, 1234")],
    solution: {
      python: "def reverse_string(s):\n    return s[::-1]",
      javascript: 'function reverseString(s) {\n  return s.split("").reverse().join("")\n}',
    },
  },
  {
    slug: "count-vowels", title: "Count the vowels", topic: "Strings", difficulty: "easy",
    statement: "Return how many vowels (a, e, i, o, u — upper or lower case) are in `s`.",
    fn: "count_vowels", params: ["s"], samples: 2,
    tests: [T(4, "Krpex Academy"), T(0, "rhythm"), T(5, "AEIOU"), T(0, ""), T(11, "The quick brown fox jumps over the lazy dog")],
    solution: {
      python: 'def count_vowels(s):\n    return sum(1 for ch in s.lower() if ch in "aeiou")',
      javascript: 'function countVowels(s) {\n  return [...s.toLowerCase()].filter((ch) => "aeiou".includes(ch)).length\n}',
    },
  },
  {
    slug: "title-case", title: "Capitalise each word", topic: "Strings", difficulty: "easy",
    statement: "Words in `s` are separated by single spaces. Return `s` with the first letter of every word in capitals and the rest in lower case.",
    fn: "title_case", params: ["s"], samples: 2,
    tests: [T("Hello World", "hello world"), T("Learn Python Today", "lEARN pYTHON tODAY"), T("A", "a"), T("", ""), T("New Delhi Is Big", "new delhi is BIG")],
    solution: {
      python: 'def title_case(s):\n    return " ".join(w[:1].upper() + w[1:].lower() for w in s.split(" "))',
      javascript: 'function titleCase(s) {\n  return s.split(" ").map((w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase()).join(" ")\n}',
    },
  },
  {
    slug: "count-words", title: "Count the words", topic: "Strings", difficulty: "easy",
    statement: "Return how many words are in `s`. Words are separated by one or more spaces; spaces at the start or end don't count.",
    fn: "word_count", params: ["s"], samples: 2,
    tests: [T(3, "I love coding"), T(2, "  many   spaces  "), T(0, ""), T(0, "     "), T(1, "word")],
    solution: {
      python: "def word_count(s):\n    return len(s.split())",
      javascript: "function wordCount(s) {\n  return s.split(\" \").filter((w) => w !== \"\").length\n}",
    },
  },
  {
    slug: "longest-word", title: "Longest word", topic: "Strings", difficulty: "easy",
    statement: "Words in `sentence` are separated by single spaces. Return the longest word; if several are equally long, return the first of them.",
    fn: "longest_word", params: ["sentence"], samples: 2,
    tests: [T("practise", "we practise code"), T("abc", "abc def ghi"), T("x", "x"), T("elephant", "a big elephant walked by")],
    solution: {
      python: 'def longest_word(sentence):\n    best = ""\n    for w in sentence.split(" "):\n        if len(w) > len(best):\n            best = w\n    return best',
      javascript: 'function longestWord(sentence) {\n  let best = ""\n  for (const w of sentence.split(" ")) if (w.length > best.length) best = w\n  return best\n}',
    },
  },
  {
    slug: "is-anagram", title: "Anagrams", topic: "Strings", difficulty: "easy",
    statement: "Two phrases are anagrams if they use exactly the same letters. Ignore spaces and upper/lower case. Return whether `a` and `b` are anagrams.",
    fn: "is_anagram", params: ["a", "b"], samples: 2,
    tests: [T(true, "listen", "silent"), T(false, "hello", "world"), T(true, "Dormitory", "dirty room"), T(false, "aab", "abb"), T(true, "", "")],
    solution: {
      python: 'def is_anagram(a, b):\n    clean = lambda s: sorted(s.replace(" ", "").lower())\n    return clean(a) == clean(b)',
      javascript: 'function isAnagram(a, b) {\n  const clean = (s) => s.replaceAll(" ", "").toLowerCase().split("").sort().join("")\n  return clean(a) === clean(b)\n}',
    },
  },
  {
    slug: "letter-count", title: "Count each character", topic: "Strings", difficulty: "easy",
    statement: "Return a dictionary (JavaScript: an object) that maps each character of `s` to how many times it appears.",
    fn: "char_count", params: ["s"], samples: 2,
    tests: [T({ b: 1, a: 3, n: 2 }, "banana"), T({}, ""), T({ a: 1, " ": 1, b: 1 }, "a b"), T({ x: 4 }, "xxxx")],
    solution: {
      python: "def char_count(s):\n    counts = {}\n    for ch in s:\n        counts[ch] = counts.get(ch, 0) + 1\n    return counts",
      javascript: "function charCount(s) {\n  const counts = {}\n  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1\n  return counts\n}",
    },
  },
  {
    slug: "palindrome-sentence", title: "Palindrome sentence", topic: "Strings", difficulty: "medium",
    statement: "A sentence is a palindrome if it reads the same backwards once you keep only letters and digits and ignore upper/lower case. Return whether `s` is one.",
    fn: "is_palindrome", params: ["s"], samples: 2,
    tests: [T(true, "A man, a plan, a canal: Panama"), T(false, "Hello"), T(true, ""), T(true, "No 'x' in Nixon"), T(false, "ab"), T(true, "12321")],
    solution: {
      python: "def is_palindrome(s):\n    kept = [ch.lower() for ch in s if ch.isalnum()]\n    return kept == kept[::-1]",
      javascript: 'function isPalindrome(s) {\n  const kept = s.toLowerCase().replace(/[^a-z0-9]/g, "")\n  return kept === kept.split("").reverse().join("")\n}',
    },
  },
  {
    slug: "compress-a-string", title: "Compress a string", topic: "Strings", difficulty: "medium",
    statement: "Replace each run of the same character by the character and the length of the run: `\"aaabcc\"` becomes `\"a3b1c2\"`.",
    fn: "compress", params: ["s"], samples: 2,
    tests: [T("a3b1c2", "aaabcc"), T("", ""), T("x1", "x"), T("a2b2a2", "aabbaa"), T("z10", "zzzzzzzzzz")],
    solution: {
      python: 'def compress(s):\n    out = ""\n    i = 0\n    while i < len(s):\n        j = i\n        while j < len(s) and s[j] == s[i]:\n            j += 1\n        out += s[i] + str(j - i)\n        i = j\n    return out',
      javascript: 'function compress(s) {\n  let out = ""\n  for (let i = 0; i < s.length; ) {\n    let j = i\n    while (j < s.length && s[j] === s[i]) j++\n    out += s[i] + (j - i)\n    i = j\n  }\n  return out\n}',
    },
  },
  {
    slug: "first-unique-character", title: "First unique character", topic: "Strings", difficulty: "medium",
    statement: "Return the index of the first character in `s` that appears only once. Return -1 if there is none.",
    fn: "first_unique", params: ["s"], samples: 2,
    tests: [T(0, "krpex"), T(2, "aabcc"), T(-1, "aabb"), T(-1, ""), T(8, "abcabcabd")],
    solution: {
      python: "def first_unique(s):\n    for i, ch in enumerate(s):\n        if s.count(ch) == 1:\n            return i\n    return -1",
      javascript: "function firstUnique(s) {\n  for (let i = 0; i < s.length; i++) if (s.indexOf(s[i]) === s.lastIndexOf(s[i])) return i\n  return -1\n}",
    },
  },
  {
    slug: "balanced-brackets", title: "Balanced brackets", topic: "Strings", difficulty: "medium",
    statement: "`s` contains only the characters `()[]{}`. Return whether every bracket is closed by the same kind of bracket, in the right order.",
    fn: "is_balanced", params: ["s"], samples: 3,
    tests: [T(true, "([]{})"), T(false, "(]"), T(false, "(()"), T(true, ""), T(false, "([)]"), T(true, "{[()()]}"), T(false, "]"), T(false, "(((")],
    solution: {
      python: 'def is_balanced(s):\n    pairs = {")": "(", "]": "[", "}": "{"}\n    stack = []\n    for ch in s:\n        if ch in pairs:\n            if not stack or stack.pop() != pairs[ch]:\n                return False\n        else:\n            stack.append(ch)\n    return not stack',
      javascript: 'function isBalanced(s) {\n  const pairs = { ")": "(", "]": "[", "}": "{" }\n  const stack = []\n  for (const ch of s) {\n    if (ch in pairs) {\n      if (stack.pop() !== pairs[ch]) return false\n    } else stack.push(ch)\n  }\n  return stack.length === 0\n}',
    },
  },
  {
    slug: "caesar-cipher", title: "Caesar cipher", topic: "Strings", difficulty: "medium",
    statement: "Shift every letter in `s` forward by `k` places in the alphabet, wrapping from z back to a. Keep upper/lower case, and leave anything that isn't a letter as it is. `k` is between 0 and 25.",
    fn: "caesar", params: ["s", "k"], samples: 2,
    tests: [T("Khoor, Zruog!", "Hello, World!", 3), T("abc", "xyz", 3), T("same", "same", 0), T("Bmfy 123", "Zkdw 123", 2), T("", "", 5)],
    solution: {
      python: 'def caesar(s, k):\n    out = ""\n    for ch in s:\n        if "a" <= ch <= "z":\n            out += chr((ord(ch) - 97 + k) % 26 + 97)\n        elif "A" <= ch <= "Z":\n            out += chr((ord(ch) - 65 + k) % 26 + 65)\n        else:\n            out += ch\n    return out',
      javascript: 'function caesar(s, k) {\n  let out = ""\n  for (const ch of s) {\n    const c = ch.charCodeAt(0)\n    if (c >= 97 && c <= 122) out += String.fromCharCode(((c - 97 + k) % 26) + 97)\n    else if (c >= 65 && c <= 90) out += String.fromCharCode(((c - 65 + k) % 26) + 65)\n    else out += ch\n  }\n  return out\n}',
    },
  },
  {
    slug: "longest-unique-substring", title: "Longest stretch without repeats", topic: "Strings", difficulty: "hard",
    statement: "Return the length of the longest substring of `s` (a run of neighbouring characters) in which no character repeats. Try to do it in one pass.",
    fn: "longest_unique", params: ["s"], samples: 2,
    tests: [T(3, "abcabcbb"), T(1, "bbbbb"), T(3, "pwwkew"), T(0, ""), T(5, "abcde"), T(2, "abba"), T(6, "dvdfabcf")],
    solution: {
      python: "def longest_unique(s):\n    seen = {}\n    start = best = 0\n    for i, ch in enumerate(s):\n        if seen.get(ch, -1) >= start:\n            start = seen[ch] + 1\n        seen[ch] = i\n        best = max(best, i - start + 1)\n    return best",
      javascript: "function longestUnique(s) {\n  const seen = new Map()\n  let start = 0\n  let best = 0\n  for (let i = 0; i < s.length; i++) {\n    if ((seen.get(s[i]) ?? -1) >= start) start = seen.get(s[i]) + 1\n    seen.set(s[i], i)\n    best = Math.max(best, i - start + 1)\n  }\n  return best\n}",
    },
  },

  // ---------- Lists ----------
  {
    slug: "sum-of-a-list", title: "Sum of a list", topic: "Lists", difficulty: "easy",
    statement: "Return the sum of the numbers in `nums`. An empty list sums to 0.",
    fn: "total", params: ["nums"], samples: 2,
    tests: [T(10, [1, 2, 3, 4]), T(0, []), T(-2, [5, -7]), T(42, [42]), T(0, [1, -1, 2, -2])],
    solution: {
      python: "def total(nums):\n    result = 0\n    for n in nums:\n        result += n\n    return result",
      javascript: "function total(nums) {\n  return nums.reduce((a, b) => a + b, 0)\n}",
    },
  },
  {
    slug: "largest-in-a-list", title: "Largest number in a list", topic: "Lists", difficulty: "easy",
    statement: "Return the largest number in `nums` (it has at least one number). Try writing the loop yourself instead of using `max`.",
    fn: "largest", params: ["nums"], samples: 2,
    tests: [T(9, [3, 9, 2]), T(-1, [-5, -1, -9]), T(7, [7]), T(100, [100, 100, 99]), T(0, [-3, 0, -1])],
    solution: {
      python: "def largest(nums):\n    best = nums[0]\n    for n in nums:\n        if n > best:\n            best = n\n    return best",
      javascript: "function largest(nums) {\n  let best = nums[0]\n  for (const n of nums) if (n > best) best = n\n  return best\n}",
    },
  },
  {
    slug: "count-evens", title: "Count the even numbers", topic: "Lists", difficulty: "easy",
    statement: "Return how many numbers in `nums` are even.",
    fn: "count_evens", params: ["nums"], samples: 2,
    tests: [T(2, [1, 2, 3, 4]), T(0, [1, 3, 5]), T(0, []), T(3, [0, -2, 8]), T(1, [7, 7, 10])],
    solution: {
      python: "def count_evens(nums):\n    return sum(1 for n in nums if n % 2 == 0)",
      javascript: "function countEvens(nums) {\n  return nums.filter((n) => n % 2 === 0).length\n}",
    },
  },
  {
    slug: "remove-duplicates", title: "Remove duplicates", topic: "Lists", difficulty: "easy",
    statement: "Return the numbers of `nums` without repeats, keeping each one where it first appeared.",
    fn: "unique", params: ["nums"], samples: 2,
    tests: [T([3, 1, 2], [3, 1, 3, 2, 1]), T([], []), T([5], [5, 5, 5]), T([1, 2, 3], [1, 2, 3]), T([-1, 0, 1], [-1, -1, 0, 1, 0])],
    solution: {
      python: "def unique(nums):\n    seen = set()\n    out = []\n    for n in nums:\n        if n not in seen:\n            seen.add(n)\n            out.append(n)\n    return out",
      javascript: "function unique(nums) {\n  return [...new Set(nums)]\n}",
    },
  },
  {
    slug: "running-sum", title: "Running total", topic: "Lists", difficulty: "easy",
    statement: "Return a list where each item is the sum of `nums` up to and including that position.",
    fn: "running_sum", params: ["nums"], samples: 2,
    tests: [T([1, 3, 6, 10], [1, 2, 3, 4]), T([], []), T([5], [5]), T([3, 3, 4, 2], [3, 0, 1, -2])],
    solution: {
      python: "def running_sum(nums):\n    out = []\n    total = 0\n    for n in nums:\n        total += n\n        out.append(total)\n    return out",
      javascript: "function runningSum(nums) {\n  let total = 0\n  return nums.map((n) => (total += n))\n}",
    },
  },
  {
    slug: "move-zeros", title: "Move the zeros to the end", topic: "Lists", difficulty: "easy",
    statement: "Return a list with all the zeros of `nums` moved to the end, keeping the other numbers in their order.",
    fn: "move_zeros", params: ["nums"], samples: 2,
    tests: [T([1, 3, 12, 0, 0], [0, 1, 0, 3, 12]), T([0], [0]), T([], []), T([1, 2], [1, 2]), T([4, 0, 0], [0, 0, 4])],
    solution: {
      python: "def move_zeros(nums):\n    rest = [n for n in nums if n != 0]\n    return rest + [0] * (len(nums) - len(rest))",
      javascript: "function moveZeros(nums) {\n  const rest = nums.filter((n) => n !== 0)\n  return rest.concat(Array(nums.length - rest.length).fill(0))\n}",
    },
  },
  {
    slug: "split-into-chunks", title: "Split into chunks", topic: "Lists", difficulty: "easy",
    statement: "Split `nums` into lists of `size` items each. The last list may be shorter.",
    fn: "chunk", params: ["nums", "size"], samples: 2,
    tests: [T([[1, 2], [3, 4], [5]], [1, 2, 3, 4, 5], 2), T([], [], 3), T([[1, 2, 3]], [1, 2, 3], 5), T([[1], [2]], [1, 2], 1)],
    solution: {
      python: "def chunk(nums, size):\n    return [nums[i:i + size] for i in range(0, len(nums), size)]",
      javascript: "function chunk(nums, size) {\n  const out = []\n  for (let i = 0; i < nums.length; i += size) out.push(nums.slice(i, i + size))\n  return out\n}",
    },
  },
  {
    slug: "second-largest", title: "Second largest", topic: "Lists", difficulty: "medium",
    statement: "Return the second largest *different* number in `nums`. If there isn't one, return `None` (JavaScript: `null`).",
    fn: "second_largest", params: ["nums"], samples: 2,
    tests: [T(7, [4, 9, 7, 9]), T(null, [5, 5]), T(null, []), T(-2, [-1, -2, -3]), T(1, [1, 2]), T(null, [3])],
    solution: {
      python: "def second_largest(nums):\n    values = sorted(set(nums), reverse=True)\n    return values[1] if len(values) > 1 else None",
      javascript: "function secondLargest(nums) {\n  const values = [...new Set(nums)].sort((a, b) => b - a)\n  return values.length > 1 ? values[1] : null\n}",
    },
  },
  {
    slug: "rotate-a-list", title: "Rotate a list", topic: "Lists", difficulty: "medium",
    statement: "Rotate `nums` to the right by `k` places: the last `k` items move to the front. `k` can be larger than the list.",
    fn: "rotate", params: ["nums", "k"], samples: 2,
    tests: [T([4, 5, 1, 2, 3], [1, 2, 3, 4, 5], 2), T([1, 2, 3], [1, 2, 3], 3), T([], [], 4), T([3, 1, 2], [1, 2, 3], 4), T([1], [1], 0)],
    solution: {
      python: "def rotate(nums, k):\n    if not nums:\n        return []\n    k %= len(nums)\n    return nums[-k:] + nums[:-k] if k else nums[:]",
      javascript: "function rotate(nums, k) {\n  if (nums.length === 0) return []\n  k %= nums.length\n  return nums.slice(nums.length - k).concat(nums.slice(0, nums.length - k))\n}",
    },
  },
  {
    slug: "merge-sorted-lists", title: "Merge two sorted lists", topic: "Lists", difficulty: "medium",
    statement: "`a` and `b` are sorted from small to large. Return one sorted list with all their numbers, by walking through both lists (no sorting).",
    fn: "merge_sorted", params: ["a", "b"], samples: 2,
    tests: [T([1, 2, 3, 4, 5, 6], [1, 3, 5], [2, 4, 6]), T([1, 2], [], [1, 2]), T([], [], []), T([1, 1, 2, 2], [1, 2], [1, 2]), T([-5, 0, 3, 8, 9], [-5, 9], [0, 3, 8])],
    solution: {
      python: "def merge_sorted(a, b):\n    i = j = 0\n    out = []\n    while i < len(a) and j < len(b):\n        if a[i] <= b[j]:\n            out.append(a[i]); i += 1\n        else:\n            out.append(b[j]); j += 1\n    return out + a[i:] + b[j:]",
      javascript: "function mergeSorted(a, b) {\n  let i = 0\n  let j = 0\n  const out = []\n  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++])\n  return out.concat(a.slice(i), b.slice(j))\n}",
    },
  },
  {
    slug: "two-sum", title: "Two sum", topic: "Lists", difficulty: "medium",
    statement: "Exactly one pair of numbers in `nums` adds up to `target`. Return their positions `[i, j]` with `i < j`. Can you do it in one pass with a dictionary?",
    fn: "two_sum", params: ["nums", "target"], samples: 2,
    tests: [T([0, 1], [2, 7, 11, 15], 9), T([1, 2], [3, 2, 4], 6), T([0, 1], [3, 3], 6), T([2, 4], [1, 5, -2, 8, 7], 5), T([0, 3], [0, 4, 3, 0], 0)],
    solution: {
      python: "def two_sum(nums, target):\n    seen = {}\n    for j, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], j]\n        seen[n] = j",
      javascript: "function twoSum(nums, target) {\n  const seen = new Map()\n  for (let j = 0; j < nums.length; j++) {\n    if (seen.has(target - nums[j])) return [seen.get(target - nums[j]), j]\n    seen.set(nums[j], j)\n  }\n}",
    },
  },
  {
    slug: "flatten-a-list", title: "Flatten a list", topic: "Lists", difficulty: "medium",
    statement: "`nested` is a list whose items are numbers or more lists, nested to any depth. Return all the numbers in one flat list, in order.",
    fn: "flatten", params: ["nested"], samples: 2,
    tests: [T([1, 2, 3, 4, 5], [1, [2, [3, 4]], 5]), T([], []), T([], [[], [[]]]), T([1, 2], [[[[1]]], 2]), T([1, 2, 3], [1, 2, 3])],
    solution: {
      python: "def flatten(nested):\n    out = []\n    for item in nested:\n        if isinstance(item, list):\n            out.extend(flatten(item))\n        else:\n            out.append(item)\n    return out",
      javascript: "function flatten(nested) {\n  const out = []\n  for (const item of nested) {\n    if (Array.isArray(item)) out.push(...flatten(item))\n    else out.push(item)\n  }\n  return out\n}",
    },
  },
  {
    slug: "transpose-a-matrix", title: "Transpose a matrix", topic: "Lists", difficulty: "medium",
    statement: "`matrix` is a list of rows, all the same length. Return its transpose: row `i` of the answer is column `i` of `matrix`.",
    fn: "transpose", params: ["matrix"], samples: 2,
    tests: [T([[1, 4], [2, 5], [3, 6]], [[1, 2, 3], [4, 5, 6]]), T([[7]], [[7]]), T([[1, 2, 3]], [[1], [2], [3]]), T([[1, 3], [2, 4]], [[1, 2], [3, 4]])],
    solution: {
      python: "def transpose(matrix):\n    return [list(col) for col in zip(*matrix)]",
      javascript: "function transpose(matrix) {\n  return matrix[0].map((_, i) => matrix.map((row) => row[i]))\n}",
    },
  },
  {
    slug: "missing-number", title: "The missing number", topic: "Lists", difficulty: "medium",
    statement: "`nums` holds all the whole numbers from 0 to `n` except one, in any order (so it has `n` items). Return the missing number.",
    fn: "missing_number", params: ["nums"], samples: 2,
    tests: [T(2, [3, 0, 1]), T(8, [9, 6, 4, 2, 3, 5, 7, 0, 1]), T(1, [0]), T(0, [1]), T(4, [0, 1, 2, 3])],
    solution: {
      python: "def missing_number(nums):\n    n = len(nums)\n    return n * (n + 1) // 2 - sum(nums)",
      javascript: "function missingNumber(nums) {\n  const n = nums.length\n  return (n * (n + 1)) / 2 - nums.reduce((a, b) => a + b, 0)\n}",
    },
  },
  {
    slug: "spiral-order", title: "Spiral order", topic: "Lists", difficulty: "hard",
    statement: "Return the numbers of `matrix` (a list of equal-length rows) in spiral order: along the top row, down the right side, back along the bottom and up the left, then the same again further in.",
    fn: "spiral_order", params: ["matrix"], samples: 2,
    tests: [
      T([1, 2, 3, 6, 9, 8, 7, 4, 5], [[1, 2, 3], [4, 5, 6], [7, 8, 9]]),
      T([1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7], [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]),
      T([1], [[1]]),
      T([1, 2, 3], [[1, 2, 3]]),
      T([1, 2, 3], [[1], [2], [3]]),
      T([], []),
    ],
    solution: {
      python: "def spiral_order(matrix):\n    out = []\n    while matrix:\n        out += matrix.pop(0)\n        matrix = [list(r) for r in zip(*matrix)][::-1]\n    return out",
      javascript: "function spiralOrder(matrix) {\n  const out = []\n  let m = matrix.map((r) => [...r])\n  while (m.length) {\n    out.push(...m.shift())\n    if (!m.length) break\n    m = m[0].map((_, i) => m.map((r) => r[i])).reverse()\n  }\n  return out\n}",
    },
  },

  // ---------- Dictionaries ----------
  {
    slug: "invert-a-dictionary", title: "Swap keys and values", topic: "Dictionaries", difficulty: "easy",
    statement: "`d` maps strings to strings, and no two keys share a value. Return a new dictionary (JavaScript: object) that maps each value back to its key.",
    fn: "invert", params: ["d"], samples: 2,
    tests: [T({ one: "a", two: "b" }, { a: "one", b: "two" }), T({}, {}), T({ Delhi: "IN", Paris: "FR" }, { IN: "Delhi", FR: "Paris" })],
    solution: {
      python: "def invert(d):\n    return {v: k for k, v in d.items()}",
      javascript: "function invert(d) {\n  return Object.fromEntries(Object.entries(d).map(([k, v]) => [v, k]))\n}",
    },
  },
  {
    slug: "word-frequency", title: "Word frequency", topic: "Dictionaries", difficulty: "medium",
    statement: "Words in `text` are separated by spaces (possibly several). Return a dictionary (JavaScript: object) mapping each word, in lower case, to how many times it appears.",
    fn: "word_freq", params: ["text"], samples: 2,
    tests: [T({ the: 2, cat: 1, and: 1, hat: 1 }, "The cat and the hat"), T({}, ""), T({ go: 3 }, "go  GO go"), T({ a: 1, b: 2 }, " a b B ")],
    solution: {
      python: "def word_freq(text):\n    counts = {}\n    for w in text.lower().split():\n        counts[w] = counts.get(w, 0) + 1\n    return counts",
      javascript: 'function wordFreq(text) {\n  const counts = {}\n  for (const w of text.toLowerCase().split(" ")) if (w) counts[w] = (counts[w] || 0) + 1\n  return counts\n}',
    },
  },
  {
    slug: "group-by-length", title: "Group words by length", topic: "Dictionaries", difficulty: "medium",
    statement: "Return a dictionary (JavaScript: object) that maps each word length to the list of words with that length, in their original order. Use the length as a key; in the expected answers it is written as a string, because JSON keys are strings.",
    fn: "group_by_length", params: ["words"], samples: 2,
    tests: [T({ "2": ["hi", "yo"], "3": ["cat", "dog"], "5": ["hello"] }, ["hi", "cat", "hello", "yo", "dog"]), T({}, []), T({ "1": ["a", "b", "c"] }, ["a", "b", "c"])],
    solution: {
      python: "def group_by_length(words):\n    groups = {}\n    for w in words:\n        groups.setdefault(len(w), []).append(w)\n    return groups",
      javascript: "function groupByLength(words) {\n  const groups = {}\n  for (const w of words) (groups[w.length] ??= []).push(w)\n  return groups\n}",
    },
  },
  {
    slug: "most-common-number", title: "Most common number", topic: "Dictionaries", difficulty: "medium",
    statement: "Return the number that appears most often in `nums` (it isn't empty). If several numbers are tied, return the smallest of them.",
    fn: "most_common", params: ["nums"], samples: 2,
    tests: [T(3, [1, 3, 2, 3, 3, 1]), T(1, [2, 1, 2, 1]), T(7, [7]), T(-1, [-1, 5, -1, 5, 0]), T(4, [9, 4, 4, 9, 4])],
    solution: {
      python: "def most_common(nums):\n    counts = {}\n    for n in nums:\n        counts[n] = counts.get(n, 0) + 1\n    return min(counts, key=lambda n: (-counts[n], n))",
      javascript: "function mostCommon(nums) {\n  const counts = new Map()\n  for (const n of nums) counts.set(n, (counts.get(n) || 0) + 1)\n  let best = null\n  for (const [n, c] of counts) if (best === null || c > counts.get(best) || (c === counts.get(best) && n < best)) best = n\n  return best\n}",
    },
  },
  {
    slug: "group-anagrams", title: "Group anagrams", topic: "Dictionaries", difficulty: "hard",
    statement: "Group the words that are anagrams of each other (same letters, any order). Sort the words inside each group alphabetically, then sort the groups by their first word.",
    fn: "group_anagrams", params: ["words"], samples: 1,
    tests: [
      T([["ate", "eat", "tea"], ["bat"], ["nat", "tan"]], ["eat", "tea", "tan", "ate", "nat", "bat"]),
      T([], []),
      T([["a"]], ["a"]),
      T([["abc", "bca", "cab"], ["xyz"]], ["xyz", "cab", "bca", "abc"]),
    ],
    solution: {
      python: 'def group_anagrams(words):\n    groups = {}\n    for w in words:\n        groups.setdefault("".join(sorted(w)), []).append(w)\n    return sorted(sorted(g) for g in groups.values())',
      javascript: 'function groupAnagrams(words) {\n  const groups = new Map()\n  for (const w of words) {\n    const key = w.split("").sort().join("")\n    if (!groups.has(key)) groups.set(key, [])\n    groups.get(key).push(w)\n  }\n  return [...groups.values()].map((g) => g.sort()).sort((a, b) => (a[0] < b[0] ? -1 : 1))\n}',
    },
  },

  // ---------- Maths and loops ----------
  {
    slug: "is-prime", title: "Prime or not", topic: "Maths and loops", difficulty: "easy",
    statement: "Return whether `n` is a prime number: greater than 1 and divisible only by 1 and itself.",
    fn: "is_prime", params: ["n"], samples: 2,
    tests: [T(true, 7), T(false, 9), T(false, 1), T(true, 2), T(false, 0), T(true, 97), T(false, 100), T(true, 7919)],
    solution: {
      python: "def is_prime(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i += 1\n    return True",
      javascript: "function isPrime(n) {\n  if (n < 2) return false\n  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false\n  return true\n}",
    },
  },
  {
    slug: "greatest-common-divisor", title: "Greatest common divisor", topic: "Maths and loops", difficulty: "easy",
    statement: "Return the largest whole number that divides both `a` and `b` (both positive). Euclid's trick: gcd(a, b) = gcd(b, a mod b).",
    fn: "gcd", params: ["a", "b"], samples: 2,
    tests: [T(6, 12, 18), T(1, 7, 13), T(5, 5, 5), T(4, 100, 8), T(21, 1071, 462)],
    solution: {
      python: "def gcd(a, b):\n    while b:\n        a, b = b, a % b\n    return a",
      javascript: "function gcd(a, b) {\n  while (b) [a, b] = [b, a % b]\n  return a\n}",
    },
  },
  {
    slug: "fibonacci", title: "Fibonacci number", topic: "Maths and loops", difficulty: "easy",
    statement: "The Fibonacci numbers start 0, 1, and each next one is the sum of the two before: 0, 1, 1, 2, 3, 5, 8… Return the `n`-th one, counting from 0.",
    fn: "fibonacci", params: ["n"], samples: 3,
    tests: [T(0, 0), T(1, 1), T(8, 6), T(55, 10), T(6765, 20), T(1, 2), T(832040, 30)],
    solution: {
      python: "def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a",
      javascript: "function fibonacci(n) {\n  let a = 0\n  let b = 1\n  for (let i = 0; i < n; i++) [a, b] = [b, a + b]\n  return a\n}",
    },
  },
  {
    slug: "digit-sum", title: "Sum of digits", topic: "Maths and loops", difficulty: "easy",
    statement: "Return the sum of the digits of the whole number `n` (ignore a minus sign).",
    fn: "digit_sum", params: ["n"], samples: 2,
    tests: [T(10, 1234), T(0, 0), T(9, 9), T(1, 1000), T(6, -42)],
    solution: {
      python: "def digit_sum(n):\n    return sum(int(d) for d in str(abs(n)))",
      javascript: "function digitSum(n) {\n  return String(Math.abs(n)).split(\"\").reduce((s, d) => s + Number(d), 0)\n}",
    },
  },
  {
    slug: "power-of-two", title: "Power of two", topic: "Maths and loops", difficulty: "easy",
    statement: "Return whether `n` is a power of two (1, 2, 4, 8, …).",
    fn: "is_power_of_two", params: ["n"], samples: 2,
    tests: [T(true, 16), T(false, 12), T(true, 1), T(false, 0), T(false, -8), T(true, 1024), T(false, 1023)],
    solution: {
      python: "def is_power_of_two(n):\n    if n < 1:\n        return False\n    while n % 2 == 0:\n        n //= 2\n    return n == 1",
      javascript: "function isPowerOfTwo(n) {\n  if (n < 1) return false\n  while (n % 2 === 0) n /= 2\n  return n === 1\n}",
    },
  },
  {
    slug: "reverse-a-number", title: "Reverse a number", topic: "Maths and loops", difficulty: "easy",
    statement: "Return the digits of `n` (0 or more) in reverse order, as a number: 120 becomes 21. Try it with `%` and `//` (JavaScript: `Math.floor`) instead of strings.",
    fn: "reverse_number", params: ["n"], samples: 2,
    tests: [T(4321, 1234), T(21, 120), T(0, 0), T(7, 7), T(1, 1000), T(9876, 6789)],
    solution: {
      python: "def reverse_number(n):\n    out = 0\n    while n > 0:\n        out = out * 10 + n % 10\n        n //= 10\n    return out",
      javascript: "function reverseNumber(n) {\n  let out = 0\n  while (n > 0) {\n    out = out * 10 + (n % 10)\n    n = Math.floor(n / 10)\n  }\n  return out\n}",
    },
  },
  {
    slug: "primes-up-to-n", title: "All primes up to n", topic: "Maths and loops", difficulty: "medium",
    statement: "Return all the prime numbers from 2 up to and including `n`, smallest first. For a fast answer, look up the Sieve of Eratosthenes.",
    fn: "primes_up_to", params: ["n"], samples: 2,
    tests: [T([2, 3, 5, 7], 10), T([], 1), T([2], 2), T([2, 3, 5, 7, 11, 13, 17, 19, 23, 29], 30), T([2, 3, 5, 7, 11, 13], 16)],
    solution: {
      python: "def primes_up_to(n):\n    is_p = [True] * (n + 1)\n    out = []\n    for i in range(2, n + 1):\n        if is_p[i]:\n            out.append(i)\n            for j in range(i * i, n + 1, i):\n                is_p[j] = False\n    return out",
      javascript: "function primesUpTo(n) {\n  const isP = Array(n + 1).fill(true)\n  const out = []\n  for (let i = 2; i <= n; i++) {\n    if (!isP[i]) continue\n    out.push(i)\n    for (let j = i * i; j <= n; j += i) isP[j] = false\n  }\n  return out\n}",
    },
  },
  {
    slug: "armstrong-number", title: "Armstrong number", topic: "Maths and loops", difficulty: "medium",
    statement: "A number is an Armstrong number if the sum of its digits, each raised to the power of the number of digits, equals the number: 153 = 1³ + 5³ + 3³. Return whether `n` (0 or more) is one.",
    fn: "is_armstrong", params: ["n"], samples: 2,
    tests: [T(true, 153), T(false, 154), T(true, 0), T(true, 9), T(false, 10), T(true, 9474), T(true, 370)],
    solution: {
      python: "def is_armstrong(n):\n    digits = str(n)\n    return sum(int(d) ** len(digits) for d in digits) == n",
      javascript: "function isArmstrong(n) {\n  const digits = String(n)\n  return [...digits].reduce((s, d) => s + Number(d) ** digits.length, 0) === n\n}",
    },
  },
  {
    slug: "decimal-to-binary", title: "Decimal to binary", topic: "Maths and loops", difficulty: "medium",
    statement: "Return the binary form of `n` (0 or more) as a string of 0s and 1s, without using built-in conversion: keep dividing by 2 and collect the remainders.",
    fn: "to_binary", params: ["n"], samples: 2,
    tests: [T("101", 5), T("0", 0), T("1", 1), T("1010", 10), T("11111111", 255), T("10000000000", 1024)],
    solution: {
      python: 'def to_binary(n):\n    if n == 0:\n        return "0"\n    bits = ""\n    while n > 0:\n        bits = str(n % 2) + bits\n        n //= 2\n    return bits',
      javascript: 'function toBinary(n) {\n  if (n === 0) return "0"\n  let bits = ""\n  while (n > 0) {\n    bits = (n % 2) + bits\n    n = Math.floor(n / 2)\n  }\n  return bits\n}',
    },
  },
  {
    slug: "roman-numerals", title: "Roman numerals", topic: "Maths and loops", difficulty: "medium",
    statement: "Write `n` (1 to 3999) in Roman numerals: I 1, V 5, X 10, L 50, C 100, D 500, M 1000, with IV 4, IX 9, XL 40, XC 90, CD 400 and CM 900.",
    fn: "to_roman", params: ["n"], samples: 2,
    tests: [T("IV", 4), T("MCMXCIV", 1994), T("I", 1), T("LVIII", 58), T("MMMCMXCIX", 3999), T("XL", 40), T("MMXXVI", 2026)],
    solution: {
      python: 'def to_roman(n):\n    table = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"),\n             (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]\n    out = ""\n    for value, letters in table:\n        while n >= value:\n            out += letters\n            n -= value\n    return out',
      javascript: 'function toRoman(n) {\n  const table = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]\n  let out = ""\n  for (const [value, letters] of table) {\n    while (n >= value) {\n      out += letters\n      n -= value\n    }\n  }\n  return out\n}',
    },
  },
  {
    slug: "pascals-triangle-row", title: "Row of Pascal's triangle", topic: "Maths and loops", difficulty: "medium",
    statement: "Return row `n` of Pascal's triangle, counting from 0. Row 0 is `[1]`; each number in a row is the sum of the two above it.",
    fn: "pascal_row", params: ["n"], samples: 2,
    tests: [T([1, 4, 6, 4, 1], 4), T([1], 0), T([1, 1], 1), T([1, 2, 1], 2), T([1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1], 10)],
    solution: {
      python: "def pascal_row(n):\n    row = [1]\n    for _ in range(n):\n        row = [1] + [row[i] + row[i + 1] for i in range(len(row) - 1)] + [1]\n    return row",
      javascript: "function pascalRow(n) {\n  let row = [1]\n  for (let k = 0; k < n; k++) row = [1, ...row.slice(1).map((v, i) => v + row[i]), 1]\n  return row\n}",
    },
  },

  // ---------- Recursion ----------
  {
    slug: "power-with-recursion", title: "Power, recursively", topic: "Recursion", difficulty: "easy",
    statement: "Return `base` raised to `exp` (0 or more) without `**` or `pow`: use base^exp = base × base^(exp − 1), with base^0 = 1.",
    fn: "power", params: ["base", "exp"], samples: 2,
    tests: [T(8, 2, 3), T(1, 5, 0), T(-27, -3, 3), T(1024, 2, 10), T(0, 0, 3)],
    solution: {
      python: "def power(base, exp):\n    if exp == 0:\n        return 1\n    return base * power(base, exp - 1)",
      javascript: "function power(base, exp) {\n  if (exp === 0) return 1\n  return base * power(base, exp - 1)\n}",
    },
  },
  {
    slug: "climbing-stairs", title: "Climbing stairs", topic: "Recursion", difficulty: "medium",
    statement: "You climb a staircase of `n` steps, taking 1 or 2 steps at a time. Return how many different ways there are to reach the top. (Plain recursion is slow for big `n` — remember answers you've already worked out.)",
    fn: "climb_stairs", params: ["n"], samples: 2,
    tests: [T(2, 2), T(3, 3), T(1, 1), T(8, 5), T(89, 10), T(1346269, 30)],
    solution: {
      python: "def climb_stairs(n):\n    a, b = 1, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a",
      javascript: "function climbStairs(n) {\n  let a = 1\n  let b = 1\n  for (let i = 0; i < n; i++) [a, b] = [b, a + b]\n  return a\n}",
    },
  },
  {
    slug: "grid-paths", title: "Paths through a grid", topic: "Recursion", difficulty: "medium",
    statement: "Start in the top-left cell of a grid with `rows` rows and `cols` columns. Moving only right or down, how many different paths reach the bottom-right cell?",
    fn: "count_paths", params: ["rows", "cols"], samples: 2,
    tests: [T(6, 3, 3), T(1, 1, 5), T(3, 2, 3), T(1, 1, 1), T(28, 3, 7), T(48620, 10, 10)],
    solution: {
      python: "def count_paths(rows, cols):\n    row = [1] * cols\n    for _ in range(rows - 1):\n        for c in range(1, cols):\n            row[c] += row[c - 1]\n    return row[-1]",
      javascript: "function countPaths(rows, cols) {\n  const row = Array(cols).fill(1)\n  for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) row[c] += row[c - 1]\n  return row[cols - 1]\n}",
    },
  },
  {
    slug: "all-permutations", title: "All arrangements of a word", topic: "Recursion", difficulty: "hard",
    statement: "Return every different arrangement of the letters of `s`, each once, sorted alphabetically. Letters may repeat in `s`.",
    fn: "permutations", params: ["s"], samples: 2,
    tests: [T(["abc", "acb", "bac", "bca", "cab", "cba"], "abc"), T(["aab", "aba", "baa"], "aab"), T(["x"], "x"), T([""], ""), T(["ab", "ba"], "ba")],
    solution: {
      python: 'def permutations(s):\n    if len(s) <= 1:\n        return [s]\n    out = set()\n    for i, ch in enumerate(s):\n        for rest in permutations(s[:i] + s[i + 1:]):\n            out.add(ch + rest)\n    return sorted(out)',
      javascript: 'function permutations(s) {\n  if (s.length <= 1) return [s]\n  const out = new Set()\n  for (let i = 0; i < s.length; i++) for (const rest of permutations(s.slice(0, i) + s.slice(i + 1))) out.add(s[i] + rest)\n  return [...out].sort()\n}',
    },
  },
  {
    slug: "all-subsets", title: "All subsets", topic: "Recursion", difficulty: "hard",
    statement: "`nums` has different numbers, sorted from small to large. Return all its subsets (including the empty one). Keep the numbers inside each subset in order. Any order of the subsets is accepted.",
    fn: "subsets", params: ["nums"], samples: 2, unordered: true,
    tests: [T([[], [1], [2], [1, 2]], [1, 2]), T([[]], []), T([[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]], [1, 2, 3]), T([[], [5]], [5])],
    solution: {
      python: "def subsets(nums):\n    out = [[]]\n    for n in nums:\n        out += [s + [n] for s in out]\n    return out",
      javascript: "function subsets(nums) {\n  let out = [[]]\n  for (const n of nums) out = out.concat(out.map((s) => [...s, n]))\n  return out\n}",
    },
  },

  // ---------- Sorting and searching ----------
  {
    slug: "sort-by-length", title: "Sort words by length", topic: "Sorting and searching", difficulty: "easy",
    statement: "Return the words sorted from shortest to longest. Words of the same length keep their original order.",
    fn: "sort_by_length", params: ["words"], samples: 2,
    tests: [T(["a", "to", "the", "word"], ["word", "a", "the", "to"]), T([], []), T(["c", "bb", "aa"], ["bb", "aa", "c"]), T(["one", "two", "three"], ["one", "two", "three"])],
    solution: {
      python: "def sort_by_length(words):\n    return sorted(words, key=len)",
      javascript: "function sortByLength(words) {\n  return [...words].sort((a, b) => a.length - b.length)\n}",
    },
  },
  {
    slug: "bubble-sort", title: "Sort it yourself", topic: "Sorting and searching", difficulty: "medium",
    statement: "Return `nums` sorted from small to large, without using a built-in sort. Bubble sort is a good start: keep swapping neighbours that are in the wrong order.",
    fn: "sort_numbers", params: ["nums"], samples: 2,
    tests: [T([1, 2, 3, 5, 8], [5, 2, 8, 1, 3]), T([], []), T([1], [1]), T([-3, -1, 0, 0, 2], [0, -1, 2, -3, 0]), T([1, 2, 3], [3, 2, 1])],
    solution: {
      python: "def sort_numbers(nums):\n    a = nums[:]\n    for i in range(len(a)):\n        for j in range(len(a) - 1 - i):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n    return a",
      javascript: "function sortNumbers(nums) {\n  const a = [...nums]\n  for (let i = 0; i < a.length; i++)\n    for (let j = 0; j < a.length - 1 - i; j++) if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]]\n  return a\n}",
    },
  },
  {
    slug: "binary-search", title: "Binary search", topic: "Sorting and searching", difficulty: "medium",
    statement: "`nums` is sorted from small to large with no repeats. Return the position of `target`, or -1 if it isn't there. Check the middle, then keep only the half that can contain the target.",
    fn: "binary_search", params: ["nums", "target"], samples: 2,
    tests: [T(4, [-1, 0, 3, 5, 9, 12], 9), T(-1, [-1, 0, 3, 5, 9, 12], 2), T(-1, [], 1), T(0, [5], 5), T(0, [1, 2, 3], 1), T(2, [1, 2, 3], 3)],
    solution: {
      python: "def binary_search(nums, target):\n    lo, hi = 0, len(nums) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1",
      javascript: "function binarySearch(nums, target) {\n  let lo = 0\n  let hi = nums.length - 1\n  while (lo <= hi) {\n    const mid = Math.floor((lo + hi) / 2)\n    if (nums[mid] === target) return mid\n    if (nums[mid] < target) lo = mid + 1\n    else hi = mid - 1\n  }\n  return -1\n}",
    },
  },
  {
    slug: "kth-smallest", title: "K-th smallest", topic: "Sorting and searching", difficulty: "medium",
    statement: "Return the `k`-th smallest number in `nums`, counting from 1 (repeats count separately).",
    fn: "kth_smallest", params: ["nums", "k"], samples: 2,
    tests: [T(3, [7, 3, 9, 1], 2), T(1, [1], 1), T(5, [5, 5, 1], 3), T(-2, [4, -2, 0, -9], 2), T(9, [7, 3, 9, 1], 4)],
    solution: {
      python: "def kth_smallest(nums, k):\n    return sorted(nums)[k - 1]",
      javascript: "function kthSmallest(nums, k) {\n  return [...nums].sort((a, b) => a - b)[k - 1]\n}",
    },
  },
  {
    slug: "merge-intervals", title: "Merge intervals", topic: "Sorting and searching", difficulty: "hard",
    statement: "Each interval is `[start, end]`. Merge all intervals that overlap or touch, and return the result sorted by start.",
    fn: "merge_intervals", params: ["intervals"], samples: 2,
    tests: [T([[1, 6], [8, 10], [15, 18]], [[1, 3], [2, 6], [8, 10], [15, 18]]), T([[1, 5]], [[1, 4], [4, 5]]), T([], []), T([[1, 10]], [[2, 3], [1, 10], [4, 5]]), T([[0, 0], [1, 2]], [[1, 2], [0, 0]])],
    solution: {
      python: "def merge_intervals(intervals):\n    out = []\n    for start, end in sorted(intervals):\n        if out and start <= out[-1][1]:\n            out[-1][1] = max(out[-1][1], end)\n        else:\n            out.append([start, end])\n    return out",
      javascript: "function mergeIntervals(intervals) {\n  const out = []\n  for (const [start, end] of [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1])) {\n    if (out.length && start <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], end)\n    else out.push([start, end])\n  }\n  return out\n}",
    },
  },

  // ---------- Problem solving ----------
  {
    slug: "best-time-to-buy", title: "Best day to buy and sell", topic: "Problem solving", difficulty: "medium",
    statement: "`prices[i]` is a share's price on day `i`. Buy on one day and sell on a later day. Return the biggest profit you can make, or 0 if no trade makes money.",
    fn: "max_profit", params: ["prices"], samples: 2,
    tests: [T(5, [7, 1, 5, 3, 6, 4]), T(0, [7, 6, 4, 3, 1]), T(0, []), T(0, [5]), T(9, [2, 4, 1, 10]), T(3, [3, 3, 6])],
    solution: {
      python: 'def max_profit(prices):\n    best = 0\n    low = float("inf")\n    for p in prices:\n        low = min(low, p)\n        best = max(best, p - low)\n    return best',
      javascript: "function maxProfit(prices) {\n  let best = 0\n  let low = Infinity\n  for (const p of prices) {\n    low = Math.min(low, p)\n    best = Math.max(best, p - low)\n  }\n  return best\n}",
    },
  },
  {
    slug: "maximum-subarray", title: "Biggest sum of a stretch", topic: "Problem solving", difficulty: "hard",
    statement: "Return the largest sum of a non-empty run of neighbouring numbers in `nums`. Can you do it in one pass (look up Kadane's algorithm)?",
    fn: "max_subarray", params: ["nums"], samples: 2,
    tests: [T(6, [-2, 1, -3, 4, -1, 2, 1, -5, 4]), T(-1, [-3, -1, -2]), T(5, [5]), T(23, [5, 4, -1, 7, 8]), T(0, [0, -1, 0])],
    solution: {
      python: "def max_subarray(nums):\n    best = cur = nums[0]\n    for n in nums[1:]:\n        cur = max(n, cur + n)\n        best = max(best, cur)\n    return best",
      javascript: "function maxSubarray(nums) {\n  let best = nums[0]\n  let cur = nums[0]\n  for (const n of nums.slice(1)) {\n    cur = Math.max(n, cur + n)\n    best = Math.max(best, cur)\n  }\n  return best\n}",
    },
  },
  {
    slug: "coin-change", title: "Fewest coins", topic: "Problem solving", difficulty: "hard",
    statement: "You have coins of the values in `coins`, as many of each as you like. Return the fewest coins that add up to exactly `amount`, or -1 if it can't be done.",
    fn: "min_coins", params: ["coins", "amount"], samples: 2,
    tests: [T(3, [1, 2, 5], 11), T(-1, [2], 3), T(0, [1], 0), T(2, [1, 3, 4], 6), T(6, [1, 5, 10, 25], 63), T(-1, [5, 10], 3)],
    solution: {
      python: 'def min_coins(coins, amount):\n    best = [0] + [float("inf")] * amount\n    for a in range(1, amount + 1):\n        for c in coins:\n            if c <= a and best[a - c] + 1 < best[a]:\n                best[a] = best[a - c] + 1\n    return best[amount] if best[amount] != float("inf") else -1',
      javascript: "function minCoins(coins, amount) {\n  const best = [0, ...Array(amount).fill(Infinity)]\n  for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) best[a] = Math.min(best[a], best[a - c] + 1)\n  return best[amount] === Infinity ? -1 : best[amount]\n}",
    },
  },
  {
    slug: "valid-sudoku-row", title: "Valid Sudoku rows", topic: "Problem solving", difficulty: "easy",
    statement: "`grid` is a list of rows of digits 0–9, where 0 means empty. Return whether no row repeats a non-zero digit.",
    fn: "rows_valid", params: ["grid"], samples: 2,
    tests: [T(true, [[5, 3, 0, 0], [6, 0, 0, 1]]), T(false, [[1, 2, 1]]), T(true, []), T(true, [[0, 0, 0]]), T(false, [[1, 2], [3, 3]])],
    solution: {
      python: "def rows_valid(grid):\n    for row in grid:\n        digits = [d for d in row if d != 0]\n        if len(digits) != len(set(digits)):\n            return False\n    return True",
      javascript: "function rowsValid(grid) {\n  return grid.every((row) => {\n    const digits = row.filter((d) => d !== 0)\n    return digits.length === new Set(digits).size\n  })\n}",
    },
  },
  {
    slug: "pairs-with-difference", title: "Pairs with a given difference", topic: "Problem solving", difficulty: "medium",
    statement: "`nums` has different numbers. Return how many pairs of them differ by exactly `k` (k is more than 0). Use a set to make it fast.",
    fn: "count_pairs", params: ["nums", "k"], samples: 2,
    tests: [T(3, [1, 5, 3, 4, 2], 2), T(0, [1, 10], 5), T(0, [], 1), T(4, [1, 2, 3, 4, 5], 1), T(3, [8, 12, 16, 4, 0, 20], 12)],
    solution: {
      python: "def count_pairs(nums, k):\n    s = set(nums)\n    return sum(1 for n in nums if n + k in s)",
      javascript: "function countPairs(nums, k) {\n  const s = new Set(nums)\n  return nums.filter((n) => s.has(n + k)).length\n}",
    },
  },
  {
    slug: "trapping-rain-water", title: "Rain water between walls", topic: "Problem solving", difficulty: "hard",
    statement: "`heights` are the heights of walls of width 1, side by side. After rain, how many units of water are trapped between them? Water above a wall rises to the lower of the tallest walls on its left and right.",
    fn: "trapped_water", params: ["heights"], samples: 2,
    tests: [T(6, [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]), T(9, [4, 2, 0, 3, 2, 5]), T(0, []), T(0, [1, 2, 3]), T(1, [2, 1, 2]), T(0, [5])],
    solution: {
      python: "def trapped_water(heights):\n    total = 0\n    for i, h in enumerate(heights):\n        level = min(max(heights[:i + 1]), max(heights[i:]))\n        total += level - h\n    return total",
      javascript: "function trappedWater(heights) {\n  let total = 0\n  heights.forEach((h, i) => {\n    total += Math.min(Math.max(...heights.slice(0, i + 1)), Math.max(...heights.slice(i))) - h\n  })\n  return total\n}",
    },
  },
]

/** A problem's number in the list (1-based, the bank's order; same as coding_problems.position). */
export const problemNumber = (slug: string) => PROBLEMS.findIndex((p) => p.slug === slug) + 1

export type PublicProblem = Omit<Problem, "solution"> & { number: number; tags: Tag[]; hints: string[] }
export type ProblemSummary = Pick<PublicProblem, "slug" | "number" | "title" | "topic" | "difficulty" | "tags">

/** What a learner's page needs: everything but the reference solutions. */
export function publicProblem(p: Problem): PublicProblem {
  const { solution: _hidden, ...rest } = p
  void _hidden
  const meta = META[p.slug] ?? { tags: [], hints: [] }
  return { ...rest, number: problemNumber(p.slug), tags: meta.tags, hints: meta.hints }
}

/** The list every page shows (no statements or tests). */
export const PROBLEM_SUMMARIES: ProblemSummary[] = PROBLEMS.map((p, i) => ({
  slug: p.slug,
  number: i + 1,
  title: p.title,
  topic: p.topic,
  difficulty: p.difficulty,
  tags: META[p.slug]?.tags ?? [],
}))

export const problemBySlug = (slug: string) => PROBLEMS.find((p) => p.slug === slug) ?? null
