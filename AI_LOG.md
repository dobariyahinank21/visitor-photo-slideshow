# AI Log

Record of prompts and the AI mistakes caught while building this project.

## Prompts used
1. Initial brief: build the Visitor Photo Slideshow (Node, Express, SQLite, Socket.io, `/upload` + `/display`), with README, ASSUMPTIONS, ARCHITECTURE, `.env.example`, tests, and incremental commits.
2. (Add your own follow-up prompts here, verbatim.)

## AI mistakes caught
1. **Wrong test command.** The AI wrote `"test": "node --test tests/"`. On Node 22 this tries to load `tests` as a module and fails with `MODULE_NOT_FOUND`. Caught by running the suite; fixed by using the glob `tests/*.test.js`.
2. **Unguarded `req.body`.** The first version of `POST /api/upload` read `req.body.name` directly. For a non-multipart request `req.body` is `undefined`, so the route would throw a 500 instead of returning a 400 validation error. Found on code review; fixed with `req.body || {}` (commit "fix(server): guard against undefined req.body").
3. (Add any further mistakes you find when you run the app, with the prompt you used to get them fixed.)

## Verification notes
- Unit tests (validation, repository, queue) were run and pass: 18/18.
- The Express/Socket.io wiring and the two pages were written in an environment without network access, so `npm install` and an end-to-end run were NOT performed there. Run `npm install && npm start` and test manually (see README) before submitting.
