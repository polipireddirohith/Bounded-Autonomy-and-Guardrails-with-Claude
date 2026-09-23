/**
 * Sample Report Generator
 * Generates realistic synthetic PR analysis reports for airaamane/simple-todo-app PRs 1–3.
 * Used to demonstrate the system output without a live API key.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ReviewReport } from '../src/types/report-types';
import { ReportGenerator } from '../src/utils/report-generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generator = new ReportGenerator();
const reportsDir = path.join(__dirname, '..', 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

// ─── PR #1: "feat: add task filtering by status" ─────────────────────────────
const pr1: ReviewReport = {
  pullRequest: { owner: 'airaamane', repo: 'simple-todo-app', number: 1 },
  fileReviews: [
    {
      file: 'src/components/TaskFilter.jsx',
      codeQuality: {
        file: 'src/components/TaskFilter.jsx',
        issues: [
          {
            line: 12,
            severity: 'high',
            category: 'bug-risk',
            description: 'Filter comparison uses loose equality (==) instead of strict (===), risking type coercion bugs.',
            suggestion: 'Replace `status == task.status` with `status === task.status` to ensure type-safe comparison.'
          },
          {
            line: 28,
            severity: 'medium',
            category: 'performance',
            description: 'Array.filter is called on every render without memoization, causing unnecessary re-computation.',
            suggestion: 'Wrap the filter logic in useMemo with [tasks, activeFilter] as dependencies.'
          },
          {
            line: 45,
            severity: 'low',
            category: 'style',
            description: 'Inline arrow function in JSX prop creates a new function reference on every render.',
            suggestion: 'Extract `handleFilterChange` as a named callback with useCallback.'
          }
        ],
        overallScore: 74,
        summary: 'TaskFilter component has minor type-safety and performance concerns. The loose equality check is the most critical fix needed.'
      },
      testCoverage: {
        file: 'src/components/TaskFilter.jsx',
        hasTests: false,
        testFiles: [],
        untestedPaths: [
          {
            type: 'function',
            location: 'handleFilterChange(status: string)',
            priority: 'high',
            reasoning: 'Core filtering logic is untested; a bug here would break task visibility for all users.',
            suggestedTest: 'it("should filter tasks by status", () => { render(<TaskFilter tasks={mockTasks} />); fireEvent.click(getByText("Active")); expect(queryByText("Completed Task")).not.toBeInTheDocument(); });'
          },
          {
            type: 'edge-case',
            location: 'TaskFilter when tasks array is empty',
            priority: 'medium',
            reasoning: 'Empty state UI branch is uncovered; an undefined access could crash the component.',
            suggestedTest: 'it("should show empty state when no tasks match filter", () => { render(<TaskFilter tasks={[]} />); expect(getByText(/no tasks/i)).toBeInTheDocument(); });'
          },
          {
            type: 'branch',
            location: 'filter === "all" early-return branch',
            priority: 'medium',
            reasoning: 'The "show all" code path has no test coverage.',
            suggestedTest: 'it("should show all tasks when filter is all", () => { render(<TaskFilter tasks={mockTasks} filter="all" />); expect(getAllByRole("listitem")).toHaveLength(mockTasks.length); });'
          }
        ],
        coverageEstimate: 0,
        summary: 'No tests exist for TaskFilter. The core filtering function and edge cases (empty list, "all" filter) require immediate coverage.'
      },
      refactorings: {
        file: 'src/components/TaskFilter.jsx',
        suggestions: [
          {
            type: 'extract-function',
            location: 'Lines 10–30: inline filter logic',
            impact: 'medium',
            description: 'Extract filtering logic into a custom hook `useTaskFilter` to separate concerns and improve reusability.',
            before: 'const filtered = tasks.filter(t => t.status == activeFilter || activeFilter === "all");',
            after: 'const filtered = useTaskFilter(tasks, activeFilter); // hooks/useTaskFilter.ts',
            benefits: 'Improves testability, reusability across components, and keeps TaskFilter as a pure presentational component.'
          },
          {
            type: 'modernize',
            location: 'Lines 40–55: filter button rendering',
            impact: 'low',
            description: 'Replace manual button array with a data-driven approach using a config array.',
            before: '<button onClick={() => setFilter("all")}>All</button>\n<button onClick={() => setFilter("active")}>Active</button>\n<button onClick={() => setFilter("completed")}>Completed</button>',
            after: 'const FILTERS = ["all","active","completed"];\n{FILTERS.map(f => <button key={f} onClick={() => setFilter(f)}>{f}</button>)}',
            benefits: 'Makes adding new filter options trivial and eliminates repetitive JSX.'
          }
        ],
        summary: 'TaskFilter would benefit from extracting filter logic into a custom hook and adopting a data-driven button pattern.'
      }
    },
    {
      file: 'src/hooks/useTaskFilter.test.js',
      codeQuality: {
        file: 'src/hooks/useTaskFilter.test.js',
        issues: [],
        overallScore: 88,
        summary: 'Test file is well-structured. No significant issues found.'
      },
      testCoverage: {
        file: 'src/hooks/useTaskFilter.test.js',
        hasTests: true,
        testFiles: ['src/hooks/useTaskFilter.test.js'],
        untestedPaths: [],
        coverageEstimate: 85,
        summary: 'Good coverage of the hook. Consider adding integration tests with the component.'
      },
      refactorings: {
        file: 'src/hooks/useTaskFilter.test.js',
        suggestions: [],
        summary: 'Test file is clean and well-organized. No refactoring needed.'
      }
    }
  ],
  summary: {
    totalFiles: 2,
    overallScore: 76,
    criticalIssues: 0,
    highPriorityTests: 1,
    refactoringOpportunities: 2
  },
  recommendations: [
    {
      priority: 'high',
      category: 'Bug Risk',
      description: 'Fix loose equality (==) in TaskFilter status comparison to prevent type coercion bugs.',
      files: ['src/components/TaskFilter.jsx']
    },
    {
      priority: 'high',
      category: 'Test Coverage',
      description: 'Add unit tests for TaskFilter filtering logic — currently at 0% coverage.',
      files: ['src/components/TaskFilter.jsx']
    },
    {
      priority: 'medium',
      category: 'Performance',
      description: 'Memoize filtered task array with useMemo to avoid re-computation on unrelated renders.',
      files: ['src/components/TaskFilter.jsx']
    },
    {
      priority: 'medium',
      category: 'Architecture',
      description: 'Extract filter logic into a custom useTaskFilter hook for separation of concerns.',
      files: ['src/components/TaskFilter.jsx']
    },
    {
      priority: 'low',
      category: 'Code Style',
      description: 'Use useCallback for event handler to avoid creating new function references on every render.',
      files: ['src/components/TaskFilter.jsx']
    }
  ],
  metadata: {
    analyzedAt: '2026-09-23T12:00:00.000Z',
    duration: 4823,
    agentVersions: {
      'code-quality-analyzer': '1.0.0',
      'test-coverage-analyzer': '1.0.0',
      'refactoring-suggester': '1.0.0',
      orchestrator: '1.0.0'
    }
  }
};

// ─── PR #2: "fix: prevent duplicate todo entries" ────────────────────────────
const pr2: ReviewReport = {
  pullRequest: { owner: 'airaamane', repo: 'simple-todo-app', number: 2 },
  fileReviews: [
    {
      file: 'src/store/todoStore.js',
      codeQuality: {
        file: 'src/store/todoStore.js',
        issues: [
          {
            line: 34,
            severity: 'critical',
            category: 'bug-risk',
            description: 'Duplicate check uses case-sensitive comparison. "Buy milk" and "buy milk" are treated as distinct entries.',
            suggestion: 'Normalize input with `.trim().toLowerCase()` before comparison: `tasks.some(t => t.title.trim().toLowerCase() === newTitle.trim().toLowerCase())`'
          },
          {
            line: 52,
            severity: 'high',
            category: 'security',
            description: 'Task title is stored without sanitization; XSS possible if titles are rendered with dangerouslySetInnerHTML elsewhere.',
            suggestion: 'Sanitize input with DOMPurify or a whitelist regex before storing: `title: DOMPurify.sanitize(rawTitle)`'
          },
          {
            line: 67,
            severity: 'medium',
            category: 'maintainability',
            description: 'Store mutation logic directly modifies array indices (tasks[idx].completed = true) instead of using immutable updates.',
            suggestion: 'Return a new array: `return tasks.map(t => t.id === id ? { ...t, completed: true } : t)`'
          }
        ],
        overallScore: 61,
        summary: 'Critical bug in duplicate detection (case-insensitive mismatch) and a high-severity XSS risk from unsanitized input. Immediate fixes required.'
      },
      testCoverage: {
        file: 'src/store/todoStore.js',
        hasTests: true,
        testFiles: ['src/store/todoStore.test.js'],
        untestedPaths: [
          {
            type: 'edge-case',
            location: 'addTask with case-insensitive duplicate',
            priority: 'critical',
            reasoning: 'The duplicate bug was introduced because this edge case had no test. Adding "Buy Milk" after "buy milk" should be rejected.',
            suggestedTest: 'it("should reject case-insensitive duplicates", () => { addTask("buy milk"); expect(() => addTask("Buy Milk")).toThrow(/duplicate/i); });'
          },
          {
            type: 'edge-case',
            location: 'addTask with whitespace-only title',
            priority: 'high',
            reasoning: 'Whitespace-only titles can be added, creating invisible tasks.',
            suggestedTest: 'it("should reject whitespace-only tasks", () => { expect(() => addTask("   ")).toThrow(/invalid/i); });'
          },
          {
            type: 'branch',
            location: 'toggleTask when id does not exist',
            priority: 'medium',
            reasoning: 'Toggle on a non-existent ID silently fails, which can mask integration bugs.',
            suggestedTest: 'it("should throw or return false for non-existent task id", () => { expect(() => toggleTask("non-existent-id")).toThrow(); });'
          }
        ],
        coverageEstimate: 55,
        summary: 'Store has some tests but critical edge cases are missing. The case-insensitive duplicate and whitespace-title cases are the highest priority additions.'
      },
      refactorings: {
        file: 'src/store/todoStore.js',
        suggestions: [
          {
            type: 'pattern-improvement',
            location: 'Lines 20–70: store mutation pattern',
            impact: 'high',
            description: 'Adopt a reducer pattern (or use Zustand/Redux Toolkit) to make state transitions explicit and testable.',
            before: 'function addTask(title) {\n  if (isDuplicate(title)) return;\n  tasks.push({ id: uuid(), title, completed: false });\n}',
            after: 'function reducer(state, action) {\n  switch (action.type) {\n    case "ADD_TASK":\n      if (isDuplicate(state.tasks, action.payload)) return state;\n      return { ...state, tasks: [...state.tasks, { id: uuid(), title: action.payload, completed: false }] };\n  }\n}',
            benefits: 'Makes state transitions pure and predictable. Eliminates mutation bugs. Greatly improves testability.'
          },
          {
            type: 'extract-function',
            location: 'Line 34: duplicate check inline logic',
            impact: 'medium',
            description: 'Extract the duplicate detection into a pure function `isExistingTask(tasks, title)` for reuse and unit testing.',
            before: 'if (tasks.some(t => t.title === newTitle)) return;',
            after: 'const isExistingTask = (tasks, title) =>\n  tasks.some(t => t.title.trim().toLowerCase() === title.trim().toLowerCase());\n\nif (isExistingTask(tasks, newTitle)) return;',
            benefits: 'Pure function is trivially unit-tested and reusable across contexts (e.g. API validation layer).'
          }
        ],
        summary: 'The store would benefit significantly from adopting a reducer/immutable pattern and extracting the duplicate-detection logic into a pure, testable function.'
      }
    }
  ],
  summary: {
    totalFiles: 1,
    overallScore: 61,
    criticalIssues: 1,
    highPriorityTests: 2,
    refactoringOpportunities: 2
  },
  recommendations: [
    {
      priority: 'critical',
      category: 'Bug Fix',
      description: 'Duplicate check is case-sensitive — normalize titles to lowercase before comparison to fix the root bug this PR attempts to address.',
      files: ['src/store/todoStore.js']
    },
    {
      priority: 'high',
      category: 'Security',
      description: 'Sanitize task titles with DOMPurify before storing to prevent potential XSS injection.',
      files: ['src/store/todoStore.js']
    },
    {
      priority: 'high',
      category: 'Test Coverage',
      description: 'Add test for case-insensitive duplicate rejection and whitespace-only title validation.',
      files: ['src/store/todoStore.test.js']
    },
    {
      priority: 'medium',
      category: 'Architecture',
      description: 'Replace mutable array push/splice patterns with immutable reducer pattern to prevent future mutation bugs.',
      files: ['src/store/todoStore.js']
    },
    {
      priority: 'low',
      category: 'Code Quality',
      description: 'Extract `isExistingTask` as a standalone pure function for reuse and isolated testing.',
      files: ['src/store/todoStore.js']
    }
  ],
  metadata: {
    analyzedAt: '2026-09-23T12:05:00.000Z',
    duration: 5241,
    agentVersions: {
      'code-quality-analyzer': '1.0.0',
      'test-coverage-analyzer': '1.0.0',
      'refactoring-suggester': '1.0.0',
      orchestrator: '1.0.0'
    }
  }
};

// ─── PR #3: "refactor: migrate to TypeScript" ────────────────────────────────
const pr3: ReviewReport = {
  pullRequest: { owner: 'airaamane', repo: 'simple-todo-app', number: 3 },
  fileReviews: [
    {
      file: 'src/types/todo.ts',
      codeQuality: {
        file: 'src/types/todo.ts',
        issues: [
          {
            line: 8,
            severity: 'medium',
            category: 'best-practice',
            description: '`id` typed as `string` but UUID libraries sometimes return branded types — use a branded `TodoId` type for type safety.',
            suggestion: 'type TodoId = string & { readonly __brand: "TodoId" }; interface Todo { id: TodoId; ... }'
          },
          {
            line: 15,
            severity: 'low',
            category: 'maintainability',
            description: '`status` field uses a plain string type instead of a discriminated union or enum.',
            suggestion: "type TodoStatus = 'pending' | 'active' | 'completed'; — this narrows the type at compile time and prevents invalid values."
          }
        ],
        overallScore: 82,
        summary: 'Good start on TypeScript migration. Type definitions are mostly sound. Consider branded ID types and status enums to leverage TypeScript\'s type system more fully.'
      },
      testCoverage: {
        file: 'src/types/todo.ts',
        hasTests: false,
        testFiles: [],
        untestedPaths: [
          {
            type: 'edge-case',
            location: 'Type guard isTodo(value: unknown): value is Todo',
            priority: 'medium',
            reasoning: 'No runtime type guard exists; deserializing from localStorage could yield invalid shapes at runtime.',
            suggestedTest: 'it("should return false for malformed todo", () => { expect(isTodo({ id: 123 })).toBe(false); });'
          }
        ],
        coverageEstimate: 0,
        summary: 'Type definition files don\'t need test coverage, but a runtime type guard would improve resilience against bad data from localStorage or API.'
      },
      refactorings: {
        file: 'src/types/todo.ts',
        suggestions: [
          {
            type: 'modernize',
            location: 'Lines 1–20: type definitions',
            impact: 'medium',
            description: 'Use `as const` and `typeof` to derive the TodoStatus union from an array, keeping a single source of truth.',
            before: "type TodoStatus = 'pending' | 'active' | 'completed';",
            after: "const TODO_STATUSES = ['pending', 'active', 'completed'] as const;\ntype TodoStatus = typeof TODO_STATUSES[number];",
            benefits: 'Enables runtime iteration over valid statuses (e.g. for filter buttons) while keeping compile-time type safety.'
          }
        ],
        summary: 'Type definitions are clean. Small modernization using `as const` would unify runtime and compile-time representations of status values.'
      }
    },
    {
      file: 'src/components/TodoList.tsx',
      codeQuality: {
        file: 'src/components/TodoList.tsx',
        issues: [
          {
            line: 22,
            severity: 'high',
            category: 'bug-risk',
            description: 'Props interface uses `any` for the `onToggle` callback type, defeating TypeScript\'s type checking.',
            suggestion: 'Type it as `onToggle: (id: TodoId) => void` to catch call-site mismatches at compile time.'
          },
          {
            line: 38,
            severity: 'medium',
            category: 'performance',
            description: 'List items use array index as `key` prop. Reordering tasks will cause React to unmount/remount DOM nodes unnecessarily.',
            suggestion: 'Use the stable todo `id` as the key: `key={todo.id}`'
          },
          {
            line: 55,
            severity: 'low',
            category: 'maintainability',
            description: 'Component handles both data fetching and rendering. This violates single-responsibility.',
            suggestion: 'Split into a container (TodoListContainer) that fetches data and a presentational (TodoList) that only renders.'
          }
        ],
        overallScore: 71,
        summary: 'TodoList.tsx has a high-severity type escape hatch (any callback), a key-prop bug that can cause subtle rendering issues, and mixed concerns.'
      },
      testCoverage: {
        file: 'src/components/TodoList.tsx',
        hasTests: true,
        testFiles: ['src/components/TodoList.test.tsx'],
        untestedPaths: [
          {
            type: 'function',
            location: 'onToggle callback invocation',
            priority: 'high',
            reasoning: 'The toggle handler is the core interaction but its invocation is not tested.',
            suggestedTest: 'it("should call onToggle with correct id when checkbox clicked", () => { const onToggle = vi.fn(); render(<TodoList todos={mockTodos} onToggle={onToggle} />); fireEvent.click(getByRole("checkbox", { name: /buy milk/i })); expect(onToggle).toHaveBeenCalledWith("todo-1"); });'
          },
          {
            type: 'edge-case',
            location: 'TodoList when todos prop is empty array',
            priority: 'medium',
            reasoning: 'Empty list renders an empty ul which may confuse users — an empty state message should be shown.',
            suggestedTest: 'it("should render empty state message when todos is empty", () => { render(<TodoList todos={[]} onToggle={vi.fn()} />); expect(getByText(/no tasks yet/i)).toBeInTheDocument(); });'
          }
        ],
        coverageEstimate: 60,
        summary: 'Good baseline coverage but the critical onToggle callback invocation is untested. Add interaction tests.'
      },
      refactorings: {
        file: 'src/components/TodoList.tsx',
        suggestions: [
          {
            type: 'extract-function',
            location: 'Lines 50–80: data-fetching logic mixed with JSX',
            impact: 'high',
            description: 'Separate data fetching into a container component and keep TodoList as a pure presentational component.',
            before: 'function TodoList() {\n  const [todos, setTodos] = useState([]);\n  useEffect(() => { fetchTodos().then(setTodos); }, []);\n  return <ul>{todos.map(...)}</ul>;\n}',
            after: '// TodoListContainer.tsx\nfunction TodoListContainer() {\n  const todos = useTodos(); // custom hook\n  return <TodoList todos={todos} onToggle={handleToggle} />;\n}\n// TodoList.tsx\nfunction TodoList({ todos, onToggle }: TodoListProps) {\n  return <ul>{todos.map(...)}</ul>;\n}',
            benefits: 'Enables snapshot testing of the pure component, eliminates async complexity from UI tests, and makes the component reusable with any data source.'
          },
          {
            type: 'pattern-improvement',
            location: 'Line 38: list key prop',
            impact: 'medium',
            description: 'Replace index-based keys with stable ID-based keys to prevent React reconciliation bugs on reorder.',
            before: 'todos.map((todo, idx) => <TodoItem key={idx} todo={todo} />)',
            after: 'todos.map(todo => <TodoItem key={todo.id} todo={todo} />)',
            benefits: 'Prevents incorrect component reuse during list reordering and improves animation/transition correctness.'
          }
        ],
        summary: 'TodoList.tsx needs container/presentational separation and stable list keys. Both are high-impact changes that will improve testability and correctness.'
      }
    }
  ],
  summary: {
    totalFiles: 2,
    overallScore: 72,
    criticalIssues: 0,
    highPriorityTests: 2,
    refactoringOpportunities: 3
  },
  recommendations: [
    {
      priority: 'high',
      category: 'Type Safety',
      description: 'Replace `any` callback type in TodoList props with the correct typed signature to leverage TypeScript correctly.',
      files: ['src/components/TodoList.tsx']
    },
    {
      priority: 'high',
      category: 'Test Coverage',
      description: 'Add interaction test for onToggle callback invocation — this is the core feature of the component.',
      files: ['src/components/TodoList.test.tsx']
    },
    {
      priority: 'medium',
      category: 'Bug Risk',
      description: 'Replace index-based list keys with stable `todo.id` keys to prevent React reconciliation bugs.',
      files: ['src/components/TodoList.tsx']
    },
    {
      priority: 'medium',
      category: 'Architecture',
      description: 'Split TodoList into a container component (data fetching) and a presentational component (rendering).',
      files: ['src/components/TodoList.tsx']
    },
    {
      priority: 'low',
      category: 'TypeScript Best Practices',
      description: 'Use `as const` pattern for TodoStatus to unify runtime iteration and compile-time type safety.',
      files: ['src/types/todo.ts']
    }
  ],
  metadata: {
    analyzedAt: '2026-09-23T12:10:00.000Z',
    duration: 6104,
    agentVersions: {
      'code-quality-analyzer': '1.0.0',
      'test-coverage-analyzer': '1.0.0',
      'refactoring-suggester': '1.0.0',
      orchestrator: '1.0.0'
    }
  }
};

// ─── Write all 9 files ────────────────────────────────────────────────────────
const reports: ReviewReport[] = [pr1, pr2, pr3];

for (const report of reports) {
  const { owner, repo, number } = report.pullRequest;
  const base = `${owner}_${repo}_${number}`;

  fs.writeFileSync(path.join(reportsDir, `${base}.json`), generator.generateJSONReport(report), 'utf-8');
  fs.writeFileSync(path.join(reportsDir, `${base}.md`), generator.generateMarkdownReport(report), 'utf-8');
  fs.writeFileSync(path.join(reportsDir, `${base}.html`), generator.generateHTMLReport(report), 'utf-8');

  console.log(`✅  Generated reports/${base}.{json,md,html}`);
}

console.log('\n✨  All 9 report files generated successfully.');
