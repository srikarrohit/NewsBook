# NewsBook Backend

Spring Boot REST API powering the NewsBook apps — the public reader app, the admin web
console, and the admin mobile app all talk to this service.

## Stack

- Java 8, Spring Boot 2.7 (`web`, `data-jpa`, `validation`)
- H2 file-based database (`backend/data/newsbook.mv.db`), accessed via JPA/Hibernate
- Lombok
- Maven

## Running locally

```bash
cd backend
mvn spring-boot:run
```

The API listens on `http://localhost:8080/api` (context path `/api`, port set in
`application.properties`). The H2 console is enabled at `/api/h2-console`.

Uploaded images are read from and written to `./images` (relative to the working
directory the JVM is started from), and the H2 database file lives under `./data` —
both paths are relative, so always run the jar from `backend/` (or wherever
`data/`/`images/` are meant to live) rather than from an arbitrary directory.

## Project layout

```
controller/   REST endpoints
service/      business logic
repository/   Spring Data JPA repositories
entity/       JPA entities (Tile, Post, Ad, AdView, User)
dto/          request/response payloads
config/       CORS / web config
```

## Endpoints

| Resource | Base path | Notes |
|---|---|---|
| Tiles (newspapers) | `/tiles` | CRUD |
| Posts | `/posts` | create/update/delete, list by tile or admin, archive |
| Ads | `/ads` | create/update/delete, list by tile or admin, archive, view/click/dismiss/charge tracking |
| Users | `/users` | login, fetch, assign tile |
| Admin | `/admin` | register, list admins, create admin for a tile |
| Images | `/images/upload` | multipart upload, returns a served `/images/...` URL |

All controllers currently allow `@CrossOrigin(origins = "*")`.

## Deployment

Deployed to an EC2 instance, managed by PM2 (see `ecosystem.config.js`), fronted by
nginx which reverse-proxies `newsbooktech.com` → `localhost:8080`. CI/CD is handled by
`.github/workflows/deploy.yml`: on push to `master`, it builds the jar with Maven, ships
it to the instance, and runs `pm2 startOrRestart` against `ecosystem.config.js`.

`data/` and `images/` on the server persist across deploys — only `app.jar` is replaced
each time.
