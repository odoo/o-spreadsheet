# Declarative rule table vs. imperative if-chain — arguing both sides

Context: `chart_suggestion_engine.ts` was refactored from a ~1279-line file where a nested
if/switch cascade dispatched to 19 `chartsForXXX` functions (each building its suggestion
list via `if (...) suggestions.push(...)`), into a ~1552-line file where a flat table of
rules (`EXACT_RULES`/`OPEN_ENDED_RULES`) matches a column "shape" and each pattern is a
`{Context, buildContext, specs}` triple evaluated by one shared function. Both versions
existed, ran, and passed the full test suite (289 suites / 15571 tests) during this session,
so the arguments below are grounded in actually having built and migrated both, not in
abstract preference.

## Argument for the declarative design

**The dispatch logic becomes a single artifact you can audit, not a control-flow path you
have to trace.** In the original code, answering "what shapes does this engine support?"
required reading ~100 lines of nested `if (numberOfColumns === 2) { if (a === "categorical"
&& b === "number") ... }` and mentally reconstructing the set of reachable branches. In the
rule-table version, the answer is: read the two arrays. Every shape the engine recognizes is
a `{id, shape}` pair sitting in plain sight, in one place, at a glance. This is not a
stylistic preference — it's the literal difference between "the answer is a piece of data"
and "the answer is a fact you derive by simulating the code in your head."

**Extending it is additive, not surgical.** Adding a new supported shape in the old code
meant finding the right nested `if` block by column count, inserting a new condition among
several ordered by hand, and hoping you didn't disturb the arithmetic (`numberOfColumns >=
3`, `a === "categorical" && b === "label"`, etc.) that the surrounding conditions depended
on implicitly. In the new code it's appending one object literal to an array. The
`matchesShape`/`EXACT_RULES`-then-`OPEN_ENDED_RULES` split was specifically designed (and
verified, see the code comments) so that **rule order inside each array never matters** —
you cannot accidentally break another rule by where you insert a new one. That guarantee
doesn't exist in an if-chain, where a misplaced condition can silently shadow or be shadowed
by another.

**Duplication went away.** The old file had 19 near-identical `const suggestions:
ChartSuggestion[] = []; if (...) suggestions.push(...); ... return suggestions;` skeletons.
The new file has one: `fromSpecs`. Every pattern's actual content — its titles, rationales,
and conditions — is now the only thing that varies between patterns; the boilerplate of
building and returning the array is written exactly once.

**It made a real test-coverage gap visible.** A review pass on the pre-refactor code (done
earlier in this session) found that 7 of the ~19 branches had zero test coverage — a fact
that took a dedicated agent reading the whole file carefully to notice, because "which
branches exist" wasn't enumerable without reconstructing the if-chain by hand. In the
rule-table version, that same audit is: list `EXACT_RULES.map(r => r.id)` and
`OPEN_ENDED_RULES.map(r => r.id)`, then check which `id`s have a corresponding `describe`
block in the test file. The design doesn't just make the code more readable, it makes the
codebase's own gaps easier to find mechanically instead of by careful reading.

**It surfaced dead code that had been quietly rotting.** The old file had three
commented-out blocks (~90 lines total) that a previous author left "for later," including an
entire disabled function. Restructuring every pattern into the same small shape made those
blocks visually stick out as not fitting the pattern everyone else follows — they got deleted
as a natural side effect of the migration, not a separate deliberate cleanup pass.

**The "first suggestion is recommended" invariant is now structurally guaranteed rather than
incidentally true.** Because every pattern's specs are declared in a fixed array read
top-to-bottom by one evaluator, the order suggestions appear in is directly readable from
the specs list — there's no risk of a future edit reordering `.push()` calls and silently
changing which chart gets the "recommended" star in the UI without anyone noticing, because
there's no `.push()` sequence left to reorder.

**When the design did have a real bug (the `_t()`-timing regression covered on the other side
of this argument), the fix stayed contained to the concern that was actually broken.** Only
`SuggestionSpec.title`/`.rationale` needed to change shape (from strings to zero-argument
thunks); `isApplicable`, `build`, every `buildContext` function, and all seventeen patterns'
actual chart-selection logic were untouched, and the fix was applied and verified as one
mechanical, scripted, whole-file transformation rather than seventeen manual edits. A
comparable fix in the old code — say, discovering that some other cross-cutting concern needed
to be deferred — would have meant touching the same line inside all 19 `chartsForXXX`
functions individually, since there was no single seam where "how a suggestion's fields get
produced" lived apart from "which suggestions exist."

## Argument for the imperative if-chain (why it might genuinely be the better call)

**It's readable by literally anyone on day one; the declarative version has an entry fee.**
To make _any_ change to the new code — even adding one `if (col.rowCount === 5)` condition —
a developer first has to learn what `ShapePattern`, `ChartSuggestionRule`, `SuggestionSpec<Ctx>`,
`fromSpecs`, and `matchesShape` are, how they compose, and why `rest.minTotalColumns` has to
be stated explicitly instead of derived (a subtlety that took real analysis to get right — see
below). The old code required zero prerequisite knowledge beyond "JavaScript if statements."
For a team with rotating contributors, junior engineers, or infrequent visitors to this file,
that's a real and recurring cost that a one-time refactor doesn't erase — it's paid by every
future reader, forever, in exchange for a benefit (uniform extensibility) that only pays off
if the shape of future changes actually matches what the abstraction anticipated.

**Understanding one pattern now means jumping through several layers of indirection instead of
reading top-to-bottom.** To know what happens for a `["number"]` shape in the old code, you
read `chartsForSingleNumberColumn` start to finish — one function, linear control flow,
`console.log` anywhere works. In the new code, you read the `EXACT_RULES` entry, follow it to
`buildSingleNumberContext` for the data, then to the `SINGLE_NUMBER_COLUMN_SUGGESTIONS` table
for the conditions, and mentally reassemble what `fromSpecs`'s `filter().map()` does with all
of that. None of these steps is hard alone, but a debugger session or a `console.log` now has
to be placed inside a closure passed to a higher-order function instead of inline in a
function body — a strictly worse experience for exactly the kind of "why did this suggestion
appear/not appear" bug this code exists to avoid.

**This migration produced a real, non-hypothetical regression that the imperative version
was structurally immune to — and getting the fix right took two attempts.** Moving suggestion
tables to module-level `const` arrays meant `_t("Pie Chart")` executed at _import time_,
before any `Model` exists — and `_t()` returns an unresolved `LazyTranslatedString` wrapper
until a `Model`'s constructor flips a global "translations loaded" flag. The result: two tests
failed with `undefined` runtimes because `suggestion.title === "Pie Chart"` was comparing a
wrapper object to a string. This is not something anyone would ever need to know or discover
in the imperative version, because `_t()` was always called inside a function invoked after a
`Model` already existed — plain, "boring" code was structurally immune to a bug that only
exists because the new code hoists data to module scope.

The first fix made every specs table itself a function (`singleNumberColumnSuggestions()`
returning a fresh array on every call) so `_t()` would run at request time — which worked, but
gave up the very property the refactor was supposed to deliver: the specs stopped being static
data and became a function that has to be re-invoked and re-allocated on every single
suggestion request, and the "declarative table you can read" is now, technically, "a function
that returns a declarative table," a subtle but real regression in what the design promised.
Fixing that required a second pass: only `title` and `rationale` — the two fields that
actually call `_t()` — became `() => string` thunks, deferred until `fromSpecs` builds the
final `ChartSuggestion`; `isApplicable` and `build` were untouched, and the specs arrays went
back to being genuine static `const`s. That the fix was contained to two field types, in one
shared interface, without touching seventeen patterns' worth of business logic, is itself
evidence for the architecture's separation of concerns — but it's also evidence that the
"obviously right" first attempt at making this data-driven was wrong, twice removed from
obviously-correct, and that every spec object in the file now has two fields that are
functions-with-no-parameters sitting next to two fields that are functions-of-context, a
distinction a newcomer has to learn and that doesn't exist at all in the plain-string,
call-it-when-you-need-it imperative version. **The new architecture didn't just add
abstraction — it opened a genuinely new category of bug, and closing it cleanly required
understanding a subtlety (`_t()`'s load-time behavior) that has nothing to do with chart
suggestions and everything to do with a translation library's internals.** That this was
caught by the existing test suite is good luck as much as good process; a less observant
migration, or a codebase with weaker test coverage of exactly this path, ships that regression
to production.

**The abstraction is solving a more general problem than the one that exists.** There are 19
chart-suggestion patterns today, added over the lifetime of one feature. Chart types don't
get added weekly; this table will likely be touched a handful of times a year. A generic
shape-matching engine with prefix/rest/minTotalColumns semantics is built for a scale of
change (dozens of contributors extending dozens of shapes) that this file may never actually
see. Solving today's problem — "these 19 branches are hard to read" — could have been done
by keeping the if-chain but improving it directly: better variable names, one function per
branch (which the old code mostly already had, via `/** Pattern X */` comments and separate
`chartsForXXX` functions), and maybe a lookup table _only_ for the outer dispatch (which
column-count/type combination maps to which function), without touching the 19 function
bodies at all. That would have delivered a large fraction of the readability win — a single
place to see "what shapes exist" — for a fraction of the diff this migration actually produced
and therefore a fraction of the regression risk.

**Not every condition decomposes cleanly into "one independent predicate per suggestion," and
forcing it there costs clarity.** `chartsForSinglePercentageColumn`'s original code was a
plain `if (rowCount === 1) {...} else if (rowCount === 3) {...}` — obviously, visibly,
mutually exclusive at a glance. Expressing that declaratively required either duplicating the
"Gauge" title across two separate spec entries with different `isApplicable` guards, or
writing an if/else _inside_ a single spec's `build` function — reintroducing exactly the
imperative branching the refactor was meant to eliminate, just relocated one level deeper and
now harder to spot because it's hidden inside a `build:` field instead of sitting at the top
level of the function. Declarative tables read best when every row is independent; the moment
two rows are coupled (mutually exclusive, order-dependent, or sharing a guard, as in
`chartsForLabelVsMultipleNumbers`'s nested radar/scatter condition), the table format is
arguably _less_ honest about what's really going on than the nested `if` it replaced.

**More code is more surface area, full stop.** The file grew from 1279 to 1552 lines (+21%)
to express the _same_ runtime behavior — confirmed by running the full pre-existing test
suite unchanged before and after. Every one of those extra ~270 lines (new interfaces, a
generic `fromSpecs<Ctx>`, a `matchesShape` matcher, per-pattern `Context` types, and now a
`() => string` thunk wrapping every title and rationale) is a place a future bug, a future
misunderstanding, or a future onboarding delay can live, in exchange for a benefit — easier
extensibility — that is speculative until someone actually needs to add shape #20.

## Where this leaves it

Both arguments are real, and both are visible in the diff produced this session: the
rule-table version genuinely made the "what's supported and what isn't" question answerable
by reading a table instead of simulating control flow, and genuinely surfaced dead code and a
test gap that hand-reading had missed. It also genuinely introduced a translation-timing bug
that the old, more boring code was structurally incapable of having — a bug that took two
iterations to fix cleanly, and whose final, correct shape (static specs arrays with two
thunked fields) is less obvious, and less discoverable by a newcomer, than either the original
imperative code or the first, wrong fix attempt. It genuinely costs more upfront comprehension
for a first-time reader, and that cost didn't go away once the bug was fixed — arguably it got
subtler, since now two fields in every spec are functions and two are plain values, for a
reason invisible from the code itself. Whether that trade is worth it depends on something the
code itself can't answer: how often this file actually gets extended by how many different
people, going forward.
