# Mini Webshop

A small tech/electronics shop. **React 19 + TypeScript** on the front, **Spring Boot 3.4 + Kotlin** on the back, talking REST over `/api`.

What it does:

- Browse a product catalog, with search and category filtering done on the server
- A basket that adds, removes, and totals items - and survives a page reload
- A product detail view you can link to and share (the open product lives in the URL)
- Checkout that submits the order to the backend, which prices it rather than trusting the page

---

## Getting started

**You need Node 20+ and JDK 21 - exactly 21, not newer.**

Gradle 8.13 does not run on JDK 24+. It reports its own version happily and then fails every real task with a bare version number (`25.0.4`) as the entire error message. The Gradle toolchain pins 21, so if `java -version` says anything newer, point `JAVA_HOME` at 21 for this project:

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 21)   # macOS
```

Then, from the repo root:

```sh
npm install
npm run dev
```

Client on **http://localhost:5173**, server on **:8080**. Vite proxies `/api` to the backend, so the browser only ever talks to one origin. Open the client and you have the whole app.

---

## Project structure

The repo is one npm workspace for the client alongside a standalone Gradle build for the server. One clone, one `npm install`, one `npm run dev` - you never have to touch Gradle directly, because the root `package.json` shells into it for you.

```
fullstack/
├── client/                 # Vite + React 19 + TypeScript (strict), plain CSS
│   └── src/
│       ├── components/     # UI, one .css file colocated per component
│       ├── hooks/          # data fetching (TanStack Query) + URL/view state
│       ├── basket/         # the Zustand basket store (persisted to localStorage)
│       ├── lib/            # apiClient, money helpers
│       ├── types/api.ts    # the wire contract - mirrors the Kotlin DTOs by hand
│       └── styles/         # global.css: design tokens + dark mode
│
└── server/                 # Spring Boot 3.4 + Kotlin 2.1 on JVM 21
    └── src/main/kotlin/com/example/api/
        ├── *Controller.kt  # HTTP layer: bind, validate, delegate
        ├── *Service.kt     # business logic (filtering, pricing)
        ├── ProductRepository.kt   # the catalog, held in memory
        └── resources/products.json  # 32 products, read once at startup
```

### The server side

The backend is a thin three layers: **Controller → Service → Repository**. Three layers to serve a JSON file is arguably overkill, but it buys a clean boundary - `ProductRepository` is the only class that knows the catalog comes from a file. Swapping in a real database means rewriting that one class; nothing above it changes.

Four endpoints, all under `/api`:

| Method | Path                 | Notes                                      |
| ------ | -------------------- | ------------------------------------------ |
| `GET`  | `/api/products`      | optional `search` and `categories` filters |
| `GET`  | `/api/products/{id}` | `404` for an unknown id                    |
| `GET`  | `/api/categories`    | distinct categories, alphabetical          |
| `POST` | `/api/purchases`     | prices the order and logs it               |

Two decisions carry most of the weight here:

- **Prices are never trusted from the client.** A purchase request carries only product ids and quantities - no names, no prices. The server resolves everything from the catalog and reprices the whole order, so nothing the browser sends about money can change what's charged. There's no price field to tamper with because there is no price field.
- **Money is integers end to end.** Every amount is an integer count of minor units (cents), never a decimal, because JSON has no exact decimal type and floats drift. A decimal appears exactly once on each side, right before the number is displayed.

Errors always come back in one `ApiError` JSON shape via a single exception handler, so the client never has to parse a raw stack trace.

### The client side

State splits cleanly in two, because it's really two different kinds of state:

- **Server state** (products, categories, one product) → **TanStack Query**, which handles caching, deduping, cancellation and retries for you.
- **Client state** (the basket, view mode, which dialog is open) → **Zustand**. The basket needs to survive a reload and be read synchronously by unrelated components - that's a store, not a cache.

Every data-driven view resolves all of its states - loading, error, empty, offline, and success - explicitly and visibly; there are no spinner-less fetches or silent failures. Styling is plain CSS: design tokens in `global.css`, dark mode by overriding those tokens, one stylesheet per component. No framework, no CSS-in-JS.

### How the data flows

A request goes browser → proxy → through the server's three layers and back. The catalog is read from `products.json` once at startup and kept in memory, so nothing below the repository ever touches the disk again.

```
  Browser  (React @ :5173)
     │  fetch('/api/products')          state on the client:
     │                                    • TanStack Query  → products, categories
     ▼                                    • Zustand store   → basket (→ localStorage)
  Vite dev proxy  ─── /api ──►  Spring Boot (:8080)
                                     │
                            Controller  → validate the request
                                 │
                            Service     → filter / reprice
                                 │
                            Repository  → products.json (loaded once, in memory)
                                 │
                                 ▼
                            response, always shaped as JSON
                            (or an ApiError on failure)
```

The basket is the exception to this flow: it lives entirely on the client and is repriced by the server only at checkout, so it renders instantly on reload without waiting on the network.

---

## How this was built

I used AI (Claude Code) throughout the process. It's a fair amount of code for a take-home: I wanted the architecture to sit as close to something production-ready as possible, and the AI let me write that much code in a timely manner. It also helped that I genuinely enjoyed the assignment and the back-and-forth of building it this way, and kept wanting to take it one step further. Either way, I led the process and made the architectural decisions, and I read and approved every single line that landed. Nothing went in that I hadn't looked at and understood.

To keep a consistent bar across the work, I defined three custom commands of my own and leaned on them throughout:

1. **`kickoff`** - run before any code, it drives the requirements out (data shapes, interactions, edge cases, empty and error behavior) and proposes a plan, so implementation starts from something unambiguous instead of an assumption. Most of the real decisions got made here.
2. **Writing, while discussing.** Implementation happened as a conversation, not a hand-off. I steered the approach as it went - component breakdown, state shape, endpoint contracts - and course-corrected in the moment rather than accepting the first thing that compiled.
3. **`review`** - runs a dedicated review pass over each change, surfacing the things that are easy to miss: React correctness bugs, accessibility gaps, Kotlin nullability traps, and drift between the client and server contract. I decided what to act on.
4. **`polish`** - a final sweep for the quality details (all UI states handled, CSS tokens instead of hardcoded values, focus management, error handling, Kotlin hygiene) before anything is called done.

---

## Trade-offs, and what I would do differently with more time

**These assumptions and decisions were taken knowingly:**

- **No persistence.** A purchase becomes one log line rather than a database row - enough to prove the flow end to end without standing up storage for it. Stock is read from a static file and never decremented, so two people can buy the last item. Real inventory needs a datastore and a transaction.
- **No pagination.** 32 products fit in one response. At a few thousand this needs paging or virtualisation, and the query keys are already shaped to take a page parameter.
- **Filtering scans the list per request.** Fine at this size; an index or a database query at a larger one.
- **One basket line per product id, with no concept of a variant** like size or colour. A variant would need a composite line key.
- **`--passWithNoTests`** is on for the client so early commits are not a hard failure. It would mask an accidental deletion of every test file, which is a real if unlikely risk.

**Given more time, I would:** decrement stock in the database on every purchase; an order-history endpoint and a `/orders/{id}` page the confirmation could link to; optimistic basket updates; a dedicated checkout flow instead of inline in the page; and wiring the product dialog's visibility directly to URL hash changes instead of routing through `App.tsx`.
