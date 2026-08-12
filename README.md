# Fusabase Demo — Oracle Backend with Firebase APIs

Three small browser demos that together form a **todo application** backed by an
Oracle Database, using the
[Oracle Backend with Firebase APIs](https://docs.oracle.com/en/database/oracle/backend-for-firebase/)
(the ORDS *FUSABASE* feature) and its
[JavaScript SDK](https://www.npmjs.com/package/fusabase).

Companion code for the blog series
[Oracle Backend with Firebase APIs](https://vvanhecke.be/en/blog/oracle-backend-firebase-apis-setup/),
in particular **Part 2: Hands-On with Auth, Database and Storage**.

| Demo | What it shows |
| --- | --- |
| [`demos/01-auth`](demos/01-auth) | Email/password sign-up and sign-in, Google federated login, auth state, ID token claims |
| [`demos/02-database`](demos/02-database) | A per-user todo list on Firestore-style collections: `addDoc`, `getDocs`, `updateDoc`, `deleteDoc`, queries with `where` + `orderBy` |
| [`demos/03-storage`](demos/03-storage) | Per-user file attachments: resumable uploads with progress, `listAll`, download URLs, delete |

Sign in once in demo 1 — the session persists in the browser and carries over
to the other demos.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:5173/ and pick a demo.

`index.js` is the minimal Node smoke test from Part 1 of the series
(`node index.js`).

## Backend configuration this expects

The demos talk to the project configured in [`fusabase-config.js`](fusabase-config.js).
To point them at your own Fusabase project:

1. **App registration** — register a `WEB` app in the Console and paste the
   generated config object into `fusabase-config.js`.
2. **Authorized domain** — add your dev origin (e.g. `http://localhost:5173`)
   to the project's authorized domains, or browser calls will be blocked.
3. **Authentication** — BASIC auth enabled; optionally the Google provider for
   federated login.
4. **Database rules** — publish [`rules/database.rules`](rules/database.rules)
   for the `todos` collection. Without them every write is denied
   (`ORA-20015: Security rule not found, access denied`).
5. **Index** — the todo query combines `where('uid','==',…)` with
   `orderBy('createdAt','desc')`, which needs an index defined in the Console.
6. **Storage rules** — publish [`rules/storage.rules`](rules/storage.rules)
   for the `attachments/{userId}` layout. Without them every upload is denied.

Everything in `fusabase-config.js` is client-side configuration, like a
Firebase config object — access control comes from auth and security rules,
not from hiding those ids.
