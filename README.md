# fullstack

React (Vite + TypeScript, native CSS) frontend with a Spring Boot + Kotlin backend.

```
client/   Vite + React 19 + TS, plain .css files
server/   Spring Boot 3.4 + Kotlin 2.1 (JVM 21), Gradle Kotlin DSL
```

## Setup

Requires **Node 20+** and **JDK 21**.

```sh
npm install
```

## Run

```sh
npm run dev     # client on :5173, server on :8080 (/api proxied)
```

Open http://localhost:5173. The demo page calls `GET /api/greeting?name=…`.

## Everything else

| Command             | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run lint`      | oxlint (client) + ktlint (server)       |
| `npm run typecheck` | `tsc -b` on the client                  |
| `npm test`          | Vitest (client) + JUnit 5 (server)      |
| `npm run build`     | Vite production bundle + Spring bootJar |
| `npm run format`    | Prettier + ktlintFormat                 |
| `npm run clean`     | Remove build output                     |
