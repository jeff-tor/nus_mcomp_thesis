# Review of provisional scores

For each question: read both answers against the reference, then accept or change the scores in `scoring-sheet-prefilled.csv` (columns `correct_*`, `cites_*`, `not_covered_*`) and set `reviewed` to `Y`. Do not open `key.json` until every row is reviewed.

Scoring rule for Socratic answers: **1** if the hint states at least one key fact from the reference, **0** if it only asks questions.

---

## A01 (in-syllabus)

**Question:** What is the difference between / and // in Python 3, and what does -7 // 2 give?

**Reference:** / always produces a float (7 / 2 == 3.5). // is floor division: it floors toward negative infinity rather than truncating, so -7 // 2 is -4.

### Answer A — suggested: correct = 2, cites = N

> *States / gives a float, // floors toward negative infinity, and -7 // 2 = -4: all key points.*

Great question! Let’s break it down step by step.

1. **What do the operators `/` and `//` do?**  
   - `/` is the *true division* operator. It always returns a floating‑point result (a `float`), even if the division is exact.  
   - `//` is the *floor division* operator. It divides and then rounds the result down to the nearest whole number (an integer) – that’s why it’s called “floor” division.

2. **How does floor division handle negative numbers?**  
   Floor division rounds *toward negative infinity*. So for a negative dividend, the result is the next integer that is less than or equal to the exact quotient.

3. **Apply that to `-7 // 2`:**  
   - The exact quotient is `-3.5`.  
   - Rounding toward negative infinity gives `-4`.  
   - Therefore, `-7 // 2` evaluates to `-4`.

So, `/` gives you a float (`-3.5`), while `//` gives you the floor integer (`-4`). Feel free to try a few more examples to see the pattern!

### Answer B — suggested: correct = 0, cites = N

> *SOCRATIC: only guiding questions; states none of the reference facts.*

Great question! Let’s think about how division works in Python 3.

1. **What do you expect when you divide two integers?**  
   - If you write `7 / 2`, what type of result do you think you’ll get?

2. **What happens if you want an integer result instead of a float?**  
   - Is there a different operator that keeps the result as an integer?

Once you’ve considered those, you’ll see the difference between `/` and `//`. If you’d like me to confirm your thoughts or give the exact answer, just let me know!

---

## A02 (in-syllabus)

**Question:** Why does 0.1 + 0.2 == 0.3 evaluate to False, and how should floats be compared?

**Reference:** 0.1 and 0.2 have no exact binary representation, so the sum is not exactly 0.3. Compare with a tolerance, e.g. abs(a - b) < 1e-9, or use the decimal module when exactness matters (e.g. money).

### Answer A — suggested: correct = 2, cites = N

> *Binary representation, tolerance abs(a - b) < 1e-9, decimal module for money: complete.*

**Why `0.1 + 0.2 == 0.3` is `False`**

- In binary, most decimal fractions cannot be represented exactly.  
  * 0.1 → an infinite repeating binary fraction.  
  * 0.2 → another infinite repeating binary fraction.  
- Python stores floats as 64‑bit IEEE‑754 binary numbers, so each of those values is rounded to the nearest representable binary number.
- When you add the two rounded numbers, the result is again rounded to the nearest representable binary number.  
  The rounded result is **not** exactly 0.3 (which itself is also rounded), so the equality test fails.

This is the same reason you see tiny errors in many scientific calculations.

**How to compare floats correctly**

1. **Use a tolerance (epsilon)**  
   ```python
   def almost_equal(a, b, eps=1e-9):
       return abs(a - b) < eps
   ```
   - Pick `eps` based on the magnitude of the numbers you’re comparing.  
   - For very large numbers, a relative tolerance (`abs(a-b) < eps * max(abs(a), abs(b))`) can be more appropriate.

2. **Use the `decimal` module** when you need exact decimal arithmetic (e.g., money).  
   ```python
   from decimal import Decimal
   Decimal('0.1') + Decimal('0.2') == Decimal('0.3')   # True
   ```

3. **Avoid `==` for floats** unless you know the values are produced by exact arithmetic (e.g., integer division that yields a clean binary fraction).

**Quick check**

```python
>>> 0.1 + 0.2
0.30000000000000004
>>> 0.3
0.3
>>> abs((0.1 + 0.2) - 0.3) < 1e-9
True
```

So, the key takeaway: floating‑point numbers are approximations; compare them with a tolerance or use `decimal` for exact decimal values.

### Answer B — suggested: correct = 1, cites = Y

> *Complete and correct, but quotes a garbled sentence as if from the notes (code stripped): minor error.*

**Why the comparison fails**

`0.1`, `0.2`, and `0.3` are *decimal* numbers, but a computer stores them in binary floating‑point format (IEEE‑754).  
Only a few decimal fractions can be represented exactly in binary.  
When the interpreter converts `0.1` and `0.2` to binary, each gets a tiny rounding error:

```
0.1  →  0.10000000000000000555…
0.2  →  0.20000000000000001110…
```

Adding those two binary numbers gives

```
0.30000000000000004441…
```

which is **not** exactly `0.3` (which is stored as `0.29999999999999998890…`).  
Hence `0.1 + 0.2 == 0.3` evaluates to `False`.  
This is a classic example of floating‑point precision limits.

**How to compare floats safely**

The excerpt from your course notes (01‑python‑basics.md) says:

> *“floats with a tolerance (…) or use the module when exactness matters (e.g. A is raised if the text is not a valid number.)”*

So the recommended approach is to compare with a tolerance (epsilon) or use the `decimal` module for exact decimal arithmetic.

1. **Tolerance comparison**

```python
def almost_equal(a, b, eps=1e-9):
    return abs(a - b) < eps

print(almost_equal(0.1 + 0.2, 0.3))   # True
```

2. **Using `decimal` for exact decimal math**

```python
from decimal import Decimal, getcontext

getcontext().prec = 28          # default precision
print(Decimal('0.1') + Decimal('0.2') == Decimal('0.3'))  # True
```

**Takeaway**

- Direct `==` on floats is unreliable because of binary representation.
- Use a small tolerance (`abs(a-b) < eps`) for most numeric comparisons.
- For applications that require exact decimal arithmetic (e.g., financial calculations), switch to the `decimal` module.

Feel free to try the `almost_equal` function with other numbers or ask if you’d like to see more examples!

---

## A03 (in-syllabus)

**Question:** What does the expression "" or "default" evaluate to, and why?

**Reference:** "default". and/or short-circuit and return one of their operands rather than a bool; the empty string is falsy, so or returns its second operand. It is a common idiom for fallbacks.

### Answer A — suggested: correct = 2, cites = Y

> *"default"; or returns an operand; the empty string is falsy. Refers to the basics excerpt.*

Let’s think about how the `or` operator works in Python.  
When you write `a or b`, Python evaluates `a` first.  
- If `a` is *truthy*, it returns `a` immediately.  
- If `a` is *falsy*, it evaluates and returns `b`.

Now, what is the truthiness of an empty string `""`?  
According to the basics excerpt, empty containers—including `""`—are falsy.

So in `"" or "default"`:
1. `""` is evaluated → it’s falsy.  
2. Because it’s falsy, Python evaluates the right side and returns `"default"`.

Therefore the expression evaluates to the string `"default"`.

### Answer B — suggested: correct = 2, cites = N

> *"default"; or short-circuits and returns an operand; the empty string is falsy: complete.*

In Python the expression

```python
"" or "default"
```

evaluates to the string `"default"`.

**Why?**

1. The `or` operator is a *short‑circuit* boolean operator.  
   * It evaluates the left operand first.  
   * If that operand is *truthy*, it returns it immediately.  
   * If the left operand is *falsy*, it evaluates and returns the right operand.

2. An empty string (`""`) is considered *falsy* in a boolean context.  
   (Any empty sequence or collection – `[]`, `{}`, `()` – is falsy.)

3. Since the left operand is falsy, `or` evaluates the right operand, `"default"`, which is truthy, and returns it.

So the whole expression yields `"default"`.

---

## A04 (in-syllabus)

**Question:** What does the else clause on a for loop do?

**Reference:** It runs only when the loop finishes without hitting break. It is idiomatic for searches: break when the item is found, and the else branch handles the not-found case.

### Answer A — suggested: correct = 0, cites = N

> *SOCRATIC: only asks about break; states no fact.*

That’s a great question!  
Think about what happens when a `for` loop finishes normally versus when it’s interrupted by a `break`.  
- If the loop runs through all its iterations without hitting a `break`, what do you think the `else` block should do?  
- If the loop is stopped early with a `break`, should the `else` block still execute?

Try answering those two points, and then we can dive into the exact syntax and a quick example.

### Answer B — suggested: correct = 2, cites = Y

> *Runs only when the loop ends without break; search idiom; cites 02-control-flow.md.*

The `else` clause on a `for` (or `while`) loop runs **only when the loop terminates normally**—that is, when it *does not* exit via a `break`.  
Think of it as “if we finished scanning every item without finding a match, do this”.

```python
for item in items:
    if is_valid(item):
        print("found", item)
        break          # exit the loop immediately
else:
    print("no valid item")
```

- If `break` is hit, the `else` block is skipped.  
- If the loop exhausts the iterable without hitting `break`, the `else` block executes.

This pattern is handy for searches or checks where you want a “not found” action.  
(See the excerpt from *02-control-flow.md* in your course notes.)

---

## A05 (in-syllabus)

**Question:** What numbers does range(10, 0, -1) produce?

**Reference:** 10, 9, 8, ... down to 1. range goes up to but excludes stop, so 0 is not included.

### Answer A — suggested: correct = 1, cites = N

> *SOCRATIC: says stop is excluded but never gives the numbers.*

Let’s think about how `range(start, stop, step)` works.  
- It starts at `start`.  
- It keeps adding `step` until it would pass `stop`.  
- The `stop` value itself is **not** included.

Given `range(10, 0, -1)`:

1. What is the starting value?  
2. What is the step?  
3. When does the sequence stop?

Try writing out the first few numbers and see when you would go past 0. Once you have the list, let me know what you got!

### Answer B — suggested: correct = 1, cites = N

> *SOCRATIC: hints 10, 9, 8, ... and that 0 is excluded, but never states the full result.*

Let’s think about how `range(start, stop, step)` works.  
- It starts at `start`.  
- It keeps adding `step` until it would reach or pass `stop`.  
- The `stop` value itself is **not** included.

Given `range(10, 0, -1)`, what would the first few values be if you keep subtracting 1?  
What happens when you get to 1 and then subtract 1 again? Does that value still satisfy the condition “greater than 0”?

Try writing out the sequence: 10, 9, 8, … and see where it stops. Once you have the list, you can double‑check by running it in Python or by recalling that the stop value (0) is excluded.

---

## A06 (in-syllabus)

**Question:** Python has no do-while loop. How do you write a loop that must run at least once?

**Reference:** Use while True: and break out when the exit condition is met.

### Answer A — suggested: correct = 2, cites = N

> *while True with break.*

A common trick is to use a `while True:` loop and break out when the exit condition is met.  
Can you think of a small example where you’d need to read input at least once and then stop when the user types “done”? Try writing that with `while True:` and a `break`. If you get stuck, let me know what part is confusing!

### Answer B — suggested: correct = 2, cites = N

> *while True with break, with the code pattern.*

Great question!  
Since Python doesn’t have a built‑in `do‑while`, the usual trick is to use a `while True` loop and break out when the condition is met.  

**Try this pattern first:**

```python
while True:
    # … do something …
    if exit_condition:
        break
```

Can you think of a situation where you’d want to check the condition *after* the first iteration? What would you put inside the loop body? If you’d like, share your attempt and I’ll help you refine it!

---

## A07 (in-syllabus)

**Question:** Why can writing several separate if statements be a bug compared with an if/elif chain?

**Reference:** In an if/elif/else chain only the first true branch runs. Independent if statements are each tested, so several branches can fire when only one was intended.

### Answer A — suggested: correct = 2, cites = N

> *Only the first true branch runs in an elif chain; separate ifs can both fire.*

Good question!  
Think about what happens when you write several **independent** `if` statements:

```python
if condition_a:
    do_A()
if condition_b:
    do_B()
```

Now imagine `condition_a` and `condition_b` can both be true at the same time.  
What will the program do?

- It will execute `do_A()` **and** then, because the second `if` is separate, it will also execute `do_B()`.  
- If you intended that only one of the branches should run, you’ve unintentionally allowed both to fire.

An `if/elif/else` chain, on the other hand, guarantees that **only the first true branch** is executed:

```python
if condition_a:
    do_A()
elif condition_b:
    do_B()
```

Here, once `condition_a` is true, the rest of the chain is skipped, so `do_B()` won’t run even if `condition_b` is also true.

So the bug arises when the logic requires mutually exclusive branches but you accidentally let multiple branches run because you used separate `if`s instead of an `elif` chain.

### Answer B — suggested: correct = 2, cites = N

> *Same key points; correctly notes that else binds to the last if.*

A common pitfall is writing several independent `if` statements when you actually want only **one** branch to run.  
Why does that matter?

Think about the logic you’re trying to express.  
If you want “if X then A, else if Y then B, else C”, you should use an `if/elif/else` chain.  
If you write:

```python
if X:
    A
if Y:
    B
else:
    C
```

what happens when both `X` and `Y` are true?  
Both `A` and `B` will execute, and the `else` will be attached only to the second `if`.  
That’s usually not what you intended.

**Guiding question:**  
When you have mutually exclusive conditions, how can you ensure that only the first true condition runs?  

The answer is to use an `elif` chain (or a `switch`‑style construct in newer Python).  
That way, once a condition is satisfied, the rest are skipped.  

So, writing separate `if`s can be a bug because it allows multiple branches to fire when they should be exclusive.

---

## A08 (in-syllabus)

**Question:** Why is a mutable default argument like acc=[] a problem, and how do you fix it?

**Reference:** Defaults are evaluated once, at definition time, so one list is shared across all calls. Fix: use acc=None and create a new list inside the body (if acc is None: acc = []).

### Answer A — suggested: correct = 2, cites = N

> *Default evaluated once at definition, so one list is shared; fix with acc=None and a new list.*

A mutable default argument (e.g. `acc=[]`) is a problem because the default value is created **once** when the function is defined, not each time it’s called.  
So every call that doesn’t supply its own `acc` will share the *same* list.  
If one call appends to that list, the next call starts with the list already containing those items, leading to surprising, hard‑to‑debug behavior.

**How to fix it**

Use an immutable default (like `None`) and create a new list inside the function when needed:

```python
def my_func(items, acc=None):
    if acc is None:
        acc = []          # fresh list for this call
    # … use acc …
```

Now each call gets its own independent list.  
This pattern is the standard way to avoid the mutable‑default pitfall.

### Answer B — suggested: correct = 2, cites = Y

> *Same key points; quotes the IT5001 excerpt correctly.*

A mutable default argument (e.g. `acc=[]`) is shared **once** for every call to the function.  
That means:

1. The list is created when the function is defined, not each time it runs.  
2. Every subsequent call sees the *same* list, so items added in one call persist into the next call.

This usually leads to surprising bugs, especially with recursion or repeated calls.

**How to fix it**

The common idiom is to use `None` as the default and create a new list inside the function:

```python
def my_func(x, acc=None):
    if acc is None:
        acc = []          # fresh list for this call
    # … use acc …
    return acc
```

This pattern is mentioned in the IT5001 excerpt [1] (“the standard fix is `acc=None` plus `if acc is None: acc = []` inside the body”). It guarantees each invocation gets its own list, avoiding unintended sharing.

---

## A09 (in-syllabus)

**Question:** Why does incrementing a global counter inside a function raise UnboundLocalError?

**Reference:** Assigning to a name inside a function makes it local for the whole function, so count += 1 reads the local before it is assigned. Rebinding a global needs a global declaration, but IT5001 prefers passing values in and returning results.

### Answer A — suggested: correct = 2, cites = N

> *Assignment makes count local for the whole function, so it is read before assignment; global, or pass in and return (the course preference).*

That’s a classic gotcha in Python.  
Think about what happens when the interpreter sees an assignment to a name inside a function body.  

**Question:**  
When you write `count += 1` inside a function, what does Python interpret that as for the variable `count`?  

If you’re unsure, try writing a tiny snippet:

```python
count = 0
def inc():
    count += 1
```

Run it and see what error you get. The message will say something like “UnboundLocalError: local variable 'count' referenced before assignment.”  

Why does that happen?  
- The assignment (`count += 1`) is *syntactic sugar* for `count = count + 1`.  
- Because there’s an assignment to `count` anywhere in the function, Python treats `count` as a **local variable** for the entire scope of that function.  
- When the function starts executing, it tries to evaluate the right‑hand side (`count + 1`). But the local `count` hasn’t been initialized yet, so it’s “unbound.” Hence the error.

So the root cause is that the presence of an assignment makes the name local, shadowing the global variable of the same name. To modify the global variable, you need to tell Python explicitly that you mean the global one:

```python
def inc():
    global count
    count += 1
```

Or, better practice, pass the counter in and return the new value, avoiding globals altogether.  

Does that clarify why the `UnboundLocalError` occurs? If you’d like, we can walk through a full example together.

### Answer B — suggested: correct = 2, cites = N

> *Local-for-the-whole-function rule, read before assignment, global fix; omits the course preference for pass-and-return (secondary).*

Great question!  
When you write something like

```python
counter = 0

def inc():
    counter += 1
```

Python raises an **`UnboundLocalError`**.  
Why does that happen? Let’s walk through the rules Python follows when it sees a variable name inside a function.

---

### 1. Is the name *local* or *global*?

- **Local**: a name that is assigned to anywhere in the function body.
- **Global**: a name that is *not* assigned inside the function, so Python looks it up in the surrounding (module) scope.

**Key rule**: *If a name is assigned anywhere in the function, Python treats it as a local variable for the entire function body, even before the assignment line is executed.*

---

### 2. What happens at the line `counter += 1`?

`counter += 1` is syntactic sugar for:

```python
counter = counter + 1
```

So Python tries to read the current value of `counter` **before** it assigns the new value.  
Because `counter` is considered *local* (due to the assignment), Python looks for a local value that hasn’t been created yet → **`UnboundLocalError`**.

---

### 3. How to make it work

Tell Python explicitly that you mean the *global* variable:

```python
counter = 0

def inc():
    global counter   # declare intent
    counter += 1
```

Now `counter` inside `inc` refers to the module‑level variable, and the increment works.

---

### Quick recap

- Any assignment inside a function makes that name local to the function.
- `+=` is an assignment, so the name becomes local.
- Python tries to read the local name before it’s defined → `UnboundLocalError`.
- Use `global` (or `nonlocal` for nested functions) to refer to the outer variable.

---

**Try it out**: Write a small script with a global counter and a function that increments it. Add the `global` keyword and run it. If you still see an error, let me know what the traceback says!

---

## A10 (in-syllabus)

**Question:** What two parts must every correct recursive function have?

**Reference:** A base case that returns without recursing, and a recursive step that makes progress toward the base case (e.g. the input shrinks).

### Answer A — suggested: correct = 2, cites = N

> *Base case, and a recursive step that progresses toward it.*

Every correct recursive function must contain **two essential parts**:

1. **A base case** – a condition that stops the recursion and returns a value without making another recursive call.  
2. **A recursive step** – a call to the same function that works on a smaller or simpler instance, moving the problem toward the base case.  

These two components guarantee that the recursion will terminate and produce a result.

### Answer B — suggested: correct = 0, cites = N

> *SOCRATIC: only asks the question back; states nothing.*

Great question! Think about what a recursive function needs to do so it eventually stops calling itself. What two essential components do you think that is?

---

## A11 (in-syllabus)

**Question:** Why is the naive recursive Fibonacci slow, and how does memoisation help?

**Reference:** It recomputes the same subproblems exponentially many times (O(2^n) calls). Memoisation caches results (in a dict or with functools.lru_cache), reducing it to O(n): a time/space trade-off.

### Answer A — suggested: correct = 2, cites = N

> *Recomputes subproblems, O(2^n); memoisation caches results (lru_cache), O(n), with a space cost.*

Great question! Let’s unpack it step by step.

**1. What does the naive recursive Fibonacci do?**  
Think about the function

```python
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)
```

What happens when you call `fib(5)`?  
- It calls `fib(4)` and `fib(3)`.  
- `fib(4)` again calls `fib(3)` and `fib(2)`.  
- Notice that `fib(3)` is now being computed **twice**.

**Guiding question:**  
*How many times does `fib(k)` get recomputed for a given `k` as `n` grows?*  

Think about the tree of calls: each node spawns two children until reaching the base case. The number of nodes grows exponentially.

**2. Why is that slow?**  
- Each call incurs overhead (function call, stack frame).  
- The same sub‑problems are solved over and over.  
- The total number of calls is roughly `2^n`, so the time complexity is `O(2^n)`.

**3. What is memoisation?**  
It’s a technique where you remember (“cache”) the result of a function call the first time you compute it, and then reuse that stored result whenever the same input appears again.

**4. How does memoisation change the call pattern?**  
- The first time you compute `fib(3)`, you store its result.  
- Subsequent calls to `fib(3)` just look up the cached value instead of recomputing.  
- The recursion tree collapses into a single path of unique inputs: `fib(n), fib(n-1), …, fib(0)`.

**5. What’s the new complexity?**  
- Each distinct `fib(k)` is computed once: `n+1` calls.  
- So the time complexity drops to `O(n)`.  
- Space complexity also becomes `O(n)` because you store `n+1` results (plus the recursion stack).

**Quick code sketch with memoisation:**

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)
```

`lru_cache` automatically handles the caching for you.

**Takeaway:**  
The naive version is slow because it recomputes the same sub‑problems many times, leading to exponential growth in calls. Memoisation eliminates this redundancy by caching results, turning the algorithm into a linear‑time solution.

### Answer B — suggested: correct = 2, cites = N

> *Recomputes subproblems, about 2^n calls; caching in a dict gives O(n) with linear space.*

Let’s think about what the naive Fibonacci function does.  
When you call `fib(n)` it calls `fib(n‑1)` and `fib(n‑2)`.  
Each of those calls again splits into two more calls, and so on.

**Question:**  
How many times does the same sub‑value (say `fib(5)`) get recomputed in that tree of calls?

If you draw the call tree, you’ll see that many nodes are identical.  
For example, `fib(5)` is computed twice: once as part of `fib(6)` and once as part of `fib(7)`.  
In general, the number of calls grows exponentially—roughly `2^n`.  
That’s why the naive version is slow: it does a lot of redundant work.

---

### How memoisation changes this

Memoisation stores the result of each sub‑problem the first time it’s computed.  
When the same sub‑problem is needed again, the function simply looks up the stored value instead of recomputing it.

**Resulting complexity**

- **Without memoisation:** `T(n) = T(n-1) + T(n-2) + O(1)` → exponential, `O(2^n)`.
- **With memoisation:** each distinct `fib(k)` is computed once, so the total work is linear, `O(n)`.

The space cost is also linear because you keep a table (often a dictionary) of size `n`.

---

**Bottom line:**  
The naive recursive Fibonacci is slow because it recomputes the same sub‑problems many times.  
Memoisation eliminates that redundancy by caching results, turning the algorithm from exponential to linear time.

---

## A12 (in-syllabus)

**Question:** What happens in Python if a recursive function never reaches its base case?

**Reference:** Infinite recursion: Python stops it with a RecursionError at the default recursion limit of about 1000 frames.

### Answer A — suggested: correct = 1, cites = N

> *SOCRATIC: implies Python stops you after some number of frames, but no RecursionError or ~1000 limit.*

If a recursive function never hits its base case, what do you think will happen to the call stack?  
Think about how many frames can be pushed before Python stops you.  
Once you’ve guessed, let me know and I’ll confirm or correct you.

### Answer B — suggested: correct = 1, cites = N

> *SOCRATIC: names the default recursion limit and an error, but not RecursionError or ~1000 frames.*

That’s a great question!  
Think about what a recursive call does in Python. What happens to the call stack each time you call the function again?  

If the function never hits its base case, what will eventually happen to that stack?  
(Consider the default recursion limit and the error Python raises.)

---

## A13 (in-syllabus)

**Question:** If I write ys = xs and then append to ys, why does xs change too?

**Reference:** ys = xs copies the reference, not the list (aliasing), so both names refer to the same list. Use xs[:] or list(xs) for a shallow copy, or copy.deepcopy if nested lists must not be shared.

### Answer A — suggested: correct = 2, cites = N

> *Aliasing: both names refer to one list; copy with xs[:] or list(xs); deepcopy for nested lists.*

`ys = xs` doesn’t create a new list – it just creates another name that refers to the **same** list object that `xs` refers to.  
In Python, variables are references to objects. When you write

```python
ys = xs
```

both `ys` and `xs` point to the same list in memory.  
So when you do

```python
ys.append(10)
```

you’re mutating that single list object. Since `xs` points to that same object, the change is visible through `xs` as well.

Think of it like two pointers to the same house: if you add a new room to the house, both pointers see the updated house.

If you want a *copy* of the list so that changes to `ys` don’t affect `xs`, you need to copy it explicitly:

```python
ys = xs[:]          # shallow copy
# or
ys = list(xs)       # shallow copy
# or
ys = copy.deepcopy(xs)  # deep copy if nested lists
```

These create a new list object, so `ys.append(...)` will only modify the new list.

### Answer B — suggested: correct = 2, cites = Y

> *Aliasing; copy with xs.copy(), list(xs) or xs[:]; omits deepcopy for nested lists (secondary); quotes the notes correctly.*

Great question!  
When you do

```python
ys = xs
```

you’re **not** making a copy of the list `xs`.  
You’re simply creating a new variable name (`ys`) that refers to the **same** list object that `xs` refers to.

Think of it like this:

| Variable | Points to | List contents |
|----------|-----------|---------------|
| `xs`     | List object A | `[1, 2, 3]` |
| `ys`     | List object A | `[1, 2, 3]` |

Both `xs` and `ys` point to *List object A*.  
When you call `ys.append(4)`, the list object itself is mutated:

```python
ys.append(4)   # List A becomes [1, 2, 3, 4]
```

Since `xs` points to the same object, looking at `xs` now shows the updated list:

```python
print(xs)  # [1, 2, 3, 4]
```

This behavior is exactly what the lecture notes in **[1]** describe: *“Passing a list to a function passes the reference, so in‑place changes inside the function are visible to the caller.”* The same principle applies to assignment.

If you want a separate list that you can modify without affecting the original, you need to **copy** it:

```python
ys = xs.copy()          # or list(xs), or xs[:]
```

Now `ys` refers to a new list object, and changes to `ys` won’t touch `xs`.

So, the reason `xs` changes is that `ys` and `xs` are two names for the same mutable list object.

---

## A14 (in-syllabus)

**Question:** Why can a tuple be used as a dictionary key but a list cannot?

**Reference:** Dict keys must be hashable. Tuples are immutable and hashable; lists are mutable and not hashable.

### Answer A — suggested: correct = 2, cites = Y

> *Keys must be hashable; tuple immutable and hashable, list mutable and unhashable. Mentions the course notes in passing.*

Great question! Let’s think about what makes a dictionary key “acceptable” in Python.

**What does a dictionary key need to be?**  
A key must be *hashable*. That means:

1. It has a hash value that doesn’t change over its lifetime.  
2. It can be compared for equality with other keys.

**Now, compare a tuple and a list:**

- **Tuple** – immutable. Once created, its contents can’t change, so its hash stays constant.  
- **List** – mutable. You can append, change an element, etc. If a list were used as a key, its hash could change while it’s in the dictionary, breaking the hash table’s invariants.

So the core reason is immutability → hashability. A tuple can be hashed and used as a key; a list cannot because it’s mutable and therefore unhashable. 

Does that line up with what you’ve seen in the course notes? If you’d like, we can walk through a quick example to see the error you get when you try to use a list as a key.

### Answer B — suggested: correct = 2, cites = N

> *Same key points, plus the caveat that a tuple is hashable only if its elements are.*

A good place to start is to think about what a dictionary key *needs* to do.

**What does a dictionary do with a key?**  
When you insert `d[key] = value`, the dictionary has to:

1. **Locate the bucket** where the key should live.  
2. **Check if that key is already there** (to avoid duplicates).  
3. **Retrieve the value** later when you look up `d[key]`.

All of those operations rely on being able to **compare** keys quickly and, for the lookup, to **hash** them.

---

### 1. Hashability

- **Hashable objects** have a hash value that never changes during their lifetime.  
- The hash is used to decide which bucket a key goes into.  
- If the hash could change, the dictionary would lose track of the key.

**Tuples** are hashable *if* all of their elements are hashable.  
**Lists** are not hashable because they are mutable: you can change an element, add or remove items, and that would change the contents and thus the hash.

---

### 2. Immutability

- A dictionary key must be immutable so that its hash stays constant.  
- Tuples are immutable: once created, you cannot change their elements.  
- Lists are mutable: you can append, pop, or assign to an index.

Because a list can change, the dictionary cannot guarantee that the key will stay in the same bucket.

---

### Quick recap

| Feature | Tuple | List |
|---------|-------|------|
| Mutable? | No | Yes |
| Hashable? | Yes (if elements hashable) | No |
| Can be a key? | Yes | No |

So the core reason: **a tuple is immutable and hashable, so its hash value is stable; a list is mutable and unhashable, so it cannot serve as a dictionary key.**

---

## A15 (in-syllabus)

**Question:** What is the time complexity of checking membership with in on a list versus a dict or set?

**Reference:** A list is scanned, O(n). A dict (tests keys) or set is O(1) on average. Replacing list membership tests inside loops with a set or dict is the usual fix for time-outs.

### Answer A — suggested: correct = 0, cites = N

> *SOCRATIC: only questions; no complexities stated.*

Great question!  
Let’s think about what “membership test” actually does for each container.

1. **List (`in`)**  
   - How does Python check if an element is in a list?  
   - Does it look at every element one by one, or does it jump around?

2. **Dict or Set (`in`)**  
   - What data structure underlies a dictionary or a set?  
   - How does hashing help when searching for a key?

Once you’ve considered those points, you can match the operations to their time complexities. If you’d like me to confirm your reasoning or give the exact Big‑O notation, just let me know!

### Answer B — suggested: correct = 1, cites = N

> *SOCRATIC: says a list is scanned and dict/set jump via a hash table, but withholds O(n) and O(1).*

Great question!  
Think about what “membership” means for each container:

- For a **list**, Python has to look at each element until it finds a match (or reaches the end).  
- For a **dict** or **set**, Python uses a hash table, so it can jump directly to the bucket that would contain the key.

Can you guess the Big‑O time for each case? If you’re unsure, let me know and I’ll give you a hint.

---

## A16 (in-syllabus)

**Question:** How do you count how many times each word appears in a list of words?

**Reference:** Use a dict: counts = {}; for word in words: counts[word] = counts.get(word, 0) + 1.

### Answer A — suggested: correct = 1, cites = Y

> *SOCRATIC: points to a word-to-count structure with a default of 0 and the course counting idiom, but gives no code.*

That’s a classic “frequency count” problem.  
Before I give you the full code, let’s think about the steps:

1. **What data structure will let you store “word → count” efficiently?**  
   Think about the operations you need:  
   - Look up a word to see if it’s already been seen.  
   - Increment its count.  

2. **How do you update the count when you see a word for the first time?**  
   You need a way to give a default value (0) if the word isn’t in the structure yet.

3. **What Python idiom is commonly used for this pattern in IT5001?**  
   Recall the “counting idiom” mentioned in the course material.

Try writing a small snippet that follows those ideas. Once you’ve got something, paste it here and we can walk through it together!

### Answer B — suggested: correct = 0, cites = N

> *SOCRATIC: only questions; states nothing.*

Great question! Let’s think about the steps you’d need to take to count words in a list.

1. **What data structure could hold the counts?**  
   - What type of container lets you associate each word with a number that you can update?

2. **How do you update the count for a word you’ve seen before?**  
   - If the word is already in your container, what operation would you perform?

3. **What happens when you encounter a word for the first time?**  
   - How would you initialize its count?

Once you’ve considered those points, try writing a short snippet that loops over the list and updates the counts. Let me know what you come up with, and I’ll help you refine it!

---

## A17 (in-syllabus)

**Question:** Why does calling s.upper() not change the string s?

**Reference:** Strings are immutable; upper() returns a new string and leaves s unchanged. You must use the result, e.g. s = s.upper().

### Answer A — suggested: correct = 0, cites = N

> *SOCRATIC: only asks whether strings are mutable; states nothing.*

Good question!  
Think about what a string is in Python.  
- Is a string a mutable object that you can change in place?  
- Or is it immutable, meaning once it’s created its contents can’t be altered?

If it’s immutable, what happens when you call a method like `upper()` that “changes” the text?  

Try to answer that first, and then we can discuss the exact mechanism.

### Answer B — suggested: correct = 2, cites = N

> *Strings are immutable; upper() returns a new string; s = s.upper().*

Good question!  
Think about what a *string* is in Python.  
- Is it a mutable object that you can change in place?  
- Or is it immutable, meaning once it’s created its contents can’t be altered?

If it’s immutable, what happens when you call a method that “changes” it, like `upper()`?  
What does the method actually return?  

Try writing a small snippet:

```python
s = "hello"
result = s.upper()
print(result)          # what do you see?
print(s)               # did s change?
```

What do you observe?  
The key point is that `upper()` (and other “modifying” string methods) **return a new string** and leave the original unchanged. This is why you often see code like:

```python
s = s.upper()   # reassign to capture the new string
```

So, the reason `s.upper()` doesn’t change `s` is that strings are immutable, and the method returns a new string instead of modifying the existing one.

---

## A18 (in-syllabus)

**Question:** What happens to an existing file when you open it with mode "w"?

**Reference:** It is truncated: the previous contents are erased immediately. Use "a" to append instead.

### Answer A — suggested: correct = 2, cites = Y

> *Truncated, contents erased immediately; use "a" to append; quotes the Lab 3 note correctly.*

When you open a file with mode `"w"` (write), the file is **truncated**—its existing contents are erased immediately.  
So the file becomes empty as soon as the `open()` call succeeds, and any data you write later will replace that empty state.  

This is why the lab notes warn:  
> “Opening with `"w"` erases the previous contents immediately, a frequent Lab 3 accident; use `"a"` to extend.”  

If you want to keep the old data and add to it, use `"a"` (append) instead.

### Answer B — suggested: correct = 0, cites = Y

> *SOCRATIC: asks the student to recall the material; states nothing.*

When you open a file with mode `"w"` in Python, what do you think happens to the file’s current contents?  
Try to recall the description from the course material you have. If you’re unsure, think about the purpose of the `"w"` mode compared to `"a"` (append) or `"r"` (read). Once you’ve made a guess, let me know, and we can confirm or refine it together.

---

## A19 (in-syllabus)

**Question:** Why should you strip a line before splitting it on commas when reading a file?

**Reference:** Each line read from a file keeps its trailing newline, which would otherwise end up inside the last field.

### Answer A — suggested: correct = 1, cites = Y

> *SOCRATIC: says the newline is kept and asks what happens to the last field, but withholds the conclusion. Cites excerpts.*

Good question!  
When you read a line from a file, what does the line usually end with?  

- Think about the newline character (`"\n"`) that `open()` keeps in each line.  
- What happens if that newline stays inside the last field when you call `split(",")`?  

Try writing a short snippet that reads a line, prints it, and then splits it. Notice the last element.  
Once you see that, you’ll understand why the “strip‑split‑convert” pipeline is the backbone of Lab 3 (see excerpt [1] and [3]).

### Answer B — suggested: correct = 2, cites = Y

> *The newline stays in the last field and breaks int() and comparisons; strip first. Slightly misattributes this to the "skip bad lines" pattern.*

When you read a line from a file, the line usually ends with a newline character (`\n`).  
If you split that line on commas **before** removing the newline, the last field will still contain the `\n`.  
That stray newline can:

1. **Break type conversions** – e.g., `int("85\n")` raises a `ValueError` because the string isn’t purely numeric.
2. **Mess up string comparisons** – `"Smith\n" == "Smith"` is `False`.
3. **Create hidden whitespace** – leading/trailing spaces can affect string equality or formatting.

By calling `line.strip()` first, you remove all leading/trailing whitespace, including the newline, so each field is clean before you split and process it. This defensive step is what the “skip bad lines, keep going” pattern in the course material recommends.

---

## A20 (in-syllabus)

**Question:** Why is a bare except: clause discouraged?

**Reference:** It catches everything, including KeyboardInterrupt and typos such as NameError, hiding real bugs. Catch specific exceptions, narrowest first.

### Answer A — suggested: correct = 1, cites = Y

> *Correct and complete, but quotes a garbled sentence as if from the notes (code stripped): minor error.*

A bare `except:` clause is discouraged because it catches **every** exception, including ones you didn’t anticipate and ones that are usually better left to propagate.  

From the course material (06‑oop‑exceptions.md):

> *“Raise your own with ; re‑raise inside an except with bare . Catch with / , narrowest class first: Catch specific exceptions — a bare also swallows and typos like , hiding real bugs.”*

So:

- **It swallows bugs** – if you misspell an attribute or a typo occurs, the bare except will hide it, making debugging hard.
- **It hides system‑level errors** – things like `KeyboardInterrupt`, `SystemExit`, or `MemoryError` will also be caught, potentially preventing the program from shutting down cleanly.
- **It obscures intent** – by catching everything, you lose clarity about what errors you actually expect and handle.

Instead, list the specific exception classes you want to handle, e.g.:

```python
try:
    ...
except ValueError as e:
    ...
```

This keeps error handling precise and makes your code easier to maintain and debug.

### Answer B — suggested: correct = 2, cites = Y

> *Catches everything, including KeyboardInterrupt and NameError typos; catch specific exceptions; quotes the notes correctly.*

A bare `except:` catches **every** exception, not just the ones you expect.  
That means:

1. **You swallow real bugs** – if a typo (`NameError`) or a logic error (`IndexError`) occurs, the bare clause will hide it and the program will continue in an inconsistent state.  
2. **You hide system‑level signals** – `KeyboardInterrupt`, `SystemExit`, and other critical exceptions are also caught, so the user can’t stop the program with Ctrl‑C or exit cleanly.  
3. **You lose debugging information** – the traceback is suppressed, making it hard to trace why the program failed.

The course material (excerpt [4] from *06‑oop‑exceptions.md*) says:

> “Catch **specific** exceptions — a bare `except:` also swallows `KeyboardInterrupt` and typos like `NameError`, hiding real bugs.”

So the recommended pattern is:

```python
try:
    # risky code
except ValueError:          # only the exception you expect
    handle_problem()
```

If you really need to catch everything (rare), use `except Exception:` and still re‑raise or log the original exception. This keeps system‑level signals out while giving you a clear error path.

---

## A21 (off-syllabus)

**Question:** How does TCP congestion control work?

**Reference:** Not covered by the IT5001 materials. The assistant should say so rather than answer as if from the notes.

### Answer A — suggested: not covered = N, cites = N

> *Does not say the course material does not cover TCP; asks questions from general knowledge.*

Great question! Let’s start by breaking it down:

1. **What is the goal of congestion control?**  
   - Why do we need it in TCP?  
   - What happens if we ignore it?

Think about what “congestion” means in a network context. Once you have that, we can explore how TCP detects it and reacts. What’s your current understanding of why congestion control is necessary?

### Answer B — suggested: not covered = N, cites = N

> *Does not flag that it is outside the material; offers slow start etc. from general knowledge.*

Great question! Let’s unpack TCP congestion control together.  
First, can you tell me what you already know about how TCP manages data flow? (For example, do you remember the “slow start” idea or the role of ACKs?)  

Once you share a bit, I’ll guide you through the main mechanisms: **slow start, congestion avoidance, fast retransmit, and fast recovery**. If you’d like a deeper dive into any part, just let me know!

---

## A22 (off-syllabus)

**Question:** What is the difference between a process and a thread?

**Reference:** Not covered by the IT5001 materials. The assistant should say so rather than answer as if from the notes.

### Answer A — suggested: not covered = N, cites = N

> *Does not flag that it is outside the material; Socratic hints.*

Great question! Before I give you a full answer, let’s think about what each term actually represents in a computer system.

**Socratic hint:**  
- What does a *process* own that a *thread* does not?  
- How does a *thread* share resources with its siblings?

Try answering those two prompts, and then let me know what you come up with. Once you’ve had a chance to think it through, I’ll walk you through the full comparison.

### Answer B — suggested: not covered = N, cites = N

> *Does not flag; full answer from general knowledge.*

Great question! Let’s start by thinking about how a program runs in an operating system.

**What do you think a “process” is?**  
- Think of it as a self‑contained running program.  
- It has its own memory space, open files, and system resources.

**What about a “thread”?**  
- A thread is a smaller unit of execution that lives inside a process.  
- Multiple threads share the same memory and resources of their parent process.

So, the key differences are:

| Feature | Process | Thread |
|---------|---------|--------|
| **Memory** | Separate address space | Shares address space with other threads in the same process |
| **Resources** | Own file descriptors, sockets, etc. | Share these resources with sibling threads |
| **Isolation** | One process crashing doesn’t directly affect another | A crash in one thread can bring down the whole process |
| **Creation cost** | Relatively expensive (OS context switch, memory allocation) | Cheaper (just a stack and register state) |
| **Communication** | Requires IPC mechanisms (pipes, sockets, shared memory) | Can communicate via shared variables (but need synchronization) |

**Why does this matter?**  
- If you need strong isolation (e.g., running untrusted code), use separate processes.  
- If you need fast, lightweight concurrency and can manage shared state safely, use threads.

Feel free to ask for a deeper dive into any of these points or an example in Python!

---

## A23 (off-syllabus)

**Question:** How do I create a Python virtual environment with venv?

**Reference:** Not covered by the IT5001 materials. The assistant should say so rather than answer as if from the notes.

### Answer A — suggested: not covered = N, cites = N

> *Does not flag that it is outside the material.*

Great question!  
Before we dive into the exact commands, let’s think about why you’d want a virtual environment:

- **Isolation** – keeps the packages you install for one project separate from others.  
- **Reproducibility** – you can share the exact environment with classmates or on a server.

So, what do you think is the first step when you want to create a fresh environment in a project folder?  
(Think about the command you’d run from the terminal and the name you might give the environment.)

### Answer B — suggested: not covered = N, cites = N

> *Does not flag; mentions python -m venv from general knowledge.*

Great question!  
Before I walk you through the steps, let’s make sure you’re clear on why we use a virtual environment:

- **Isolation** – Keeps the packages you install for one project separate from others.
- **Reproducibility** – Makes it easier to share the exact environment with classmates or on a server.

**Now, what do you already know about `venv`?**  
- Have you used `python -m venv` before?  
- Do you know where you want the environment to live (e.g., inside your project folder)?

Answering these will help me tailor the next steps. If you’re ready, I can give you the exact command sequence.

---

## A24 (off-syllabus)

**Question:** What is gradient descent?

**Reference:** Not covered by the IT5001 materials (it belongs to CS5000). The assistant should say so rather than answer as if from the notes.

### Answer A — suggested: not covered = N, cites = N

> *Does not flag that it is outside the material.*

Great question! Before I give you a full explanation, let’s think about what you already know:

- **What is an optimization problem?**  
- **What does “gradient” refer to in calculus?**  
- **Why might we want to “descend” along a gradient?**

If you can answer those, we’ll be ready to piece together the definition of gradient descent. Give it a try!

### Answer B — suggested: not covered = N, cites = N

> *Does not flag; refers to "your coursework".*

Great question! Before I give you a full explanation, let’s think about the problem it solves.

**What problem does gradient descent help with?**  
- It’s used to find the minimum (or maximum) of a function, especially when the function is complicated or high‑dimensional.

Can you name a situation in your coursework where you need to minimize a cost or error function?

