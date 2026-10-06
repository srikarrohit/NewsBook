# Cutover: Java/H2 server → Rust + RDS + t4g.nano

| | Old | New |
|---|---|---|
| Server | `i-07e64f94d72608578` t3.micro (x86), 16.112.67.15 | `i-06a24b5481d0bb715` t4g.nano (ARM), Elastic IP **16.112.243.119** |
| Backend | Java/Spring Boot (pm2) | Rust (`backend/`, systemd `newsbook-backend`) |
| Database | H2 file on the server's disk | RDS MySQL `newsbook-db` (7-day automatic backups) |
| Photos | Sydney bucket `newsbook-data` + server disk | Hyderabad bucket `newsbook-data-hyd` only |
| Admin web | `serve` on port 4173 | static files served by nginx |

The new server never builds anything: GitHub Actions cross-compiles the ARM binary.
A disk snapshot of the old server (`snap-0924a3f5ad59ca045`) was taken before any of this.

## Steps

1. **GitHub secrets** (Settings → Secrets and variables → Actions): set `EC2_HOST`,
   `DATABASE_URL`, `APP_AWS_ACCESS_KEY_ID`, `APP_AWS_SECRET_ACCESS_KEY`, `GEMINI_API_KEY`.
   `EC2_USER` / `EC2_SSH_KEY` are unchanged.
2. **Push `master`** → the Deploy workflow installs the backend and admin site on the new
   server. The backend is installed but not started yet (certbot warnings are expected
   until step 4).
3. **Actions → "Migrate to RDS (one-time)" → Run**, type `MIGRATE`. It stops the Java
   backend, exports H2, imports into RDS, moves all photos to the Hyderabad bucket, starts
   the Rust backend, and makes the old server forward API traffic to the new one. Not
   between 12:15 and 6:00 am IST - the new server is switched off then.
4. **GoDaddy DNS**: point the `A` records for `newsbooktech.com`, `www` and `admin` at
   `16.112.243.119`. After it propagates, re-run the Deploy workflow (Actions → Deploy →
   Run workflow) so certbot issues HTTPS certificates on the new server.
5. After a day or two without problems: stop, then terminate, the old instance; delete the
   Sydney bucket `newsbook-data`.

## If something goes wrong

Before step 4 the old server still has its H2 database untouched. Roll back with:

```sh
ssh ec2-user@16.112.67.15 'sudo cp /etc/nginx/conf.d/newsbooktech.conf.pre-migration /etc/nginx/conf.d/newsbooktech.conf && sudo systemctl reload nginx && pm2 start newsbook-backend'
```

Anything written to the new server after the migration is not in H2.

If the backend can't connect to RDS with `ssl-mode=verify_identity`, check
`journalctl -u newsbook-backend` on the new server; `ssl-mode=required` (encrypted, no
certificate check) is the fallback.

## Operations

- Nightly at 12:00 am IST the backend archives published posts and ads (kept, with their
  photos, just hidden from feeds); run it by hand with
  `sudo -u ec2-user bash -c 'set -a; . /etc/newsbook/backend.env; cd ~/newsbook-backend && ./newsbook-backend run-nightly-job'`.
- EventBridge Scheduler stops the server at 12:15 am and starts it at 6:00 am IST
  (`newsbook-nightly-stop` / `newsbook-morning-start`).
- Logs: `journalctl -u newsbook-backend -f`.
