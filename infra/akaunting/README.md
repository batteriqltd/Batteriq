# Batteriq Books (Akaunting on Railway)

Source-available accounting (Akaunting, Business Source License 1.1) running on Railway.
Project `batteriq-books`: service `books` (this folder) + `MySQL`.

- URL: https://books-production-6661ac5c.up.railway.app
- Admin panel link: `/admin/books` on batteriq.com (override with `NEXT_PUBLIC_BOOKS_URL`)
- All config lives in Railway variables. No `.env` file is kept in the container.
- Uploads/sessions persist on the `books-volume` volume mounted at `/var/www/html/storage`.

## Deploy
```bash
cd infra/akaunting
railway link          # pick batteriq-books / production / books (first time only)
railway up --service books
```
The entrypoint installs Akaunting only when the database is empty; afterwards it
just runs pending migrations. The web installer is always closed (`APP_INSTALLED=true`).

## Custom domain (books.batteriq.com)
```bash
railway domain books.batteriq.com --service books --port 8080
```
Add the CNAME (and TXT, if shown) it prints at the DNS provider, wait for the
certificate, then:
```bash
railway variable set APP_URL=https://books.batteriq.com --service books
```
and set `NEXT_PUBLIC_BOOKS_URL=https://books.batteriq.com` in Vercel.

## Backups (do this before every upgrade, and weekly)
Database dump, run from this folder:
```bash
railway ssh --service books -- sh -c 'mysqldump --no-tablespaces -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" | gzip > storage/app/backup.sql.gz'
railway volume files download /app/backup.sql.gz ./books-backup-$(date +%F).sql.gz
railway volume files delete /app/backup.sql.gz --yes
```
Uploaded files: `railway volume files download /app/uploads ./uploads-backup` (or browse with
`railway volume files browse /`). Keep backups OFF this machine's repo folder and never commit them.

Restore: `gunzip -c file.sql.gz | mysql ...` from `railway ssh`, after uploading the file
to the volume with `railway volume files upload`.

## Upgrade Akaunting
1. Read the release notes: https://github.com/akaunting/akaunting/releases
2. Take a database + uploads backup (above) and confirm the file is not empty.
3. Change `ARG AKAUNTING_VERSION=` in `Dockerfile` to the new version.
4. `railway up --service books` - the entrypoint runs `php artisan migrate --force`.
5. Log in and check an invoice and a report. If broken: set the version back,
   `railway up` again, and restore the dump if migrations already changed the data.

Do not use Akaunting's in-app updater: the container filesystem is replaced on
every deploy, so in-app updates are lost.

## Security checklist
- Change the first admin password after first login, then delete `ADMIN_PASSWORD`
  from Railway variables.
- Turn on two-factor authentication for every Books user.
- No public registration exists; create users only under Settings > Users.
- MySQL is reached over Railway's private network. Do not share the MySQL public URL.

## Licence (read before changing anything)
Akaunting 3.x is under the Business Source License 1.1, not the GPL. Free production
use is allowed only while ALL of these hold:
- at most 2 users, 1 company and 1,000 invoices;
- Akaunting's name, logo and branding are not removed to make a rebranded or
  white-labelled product or service;
- it is not offered to third parties as an accounting service.

Anything beyond that needs a paid licence: https://akaunting.com/plans-on-premise
So: do not patch out the plan-limit checks, and do not replace "Akaunting" with another
brand. Adding our own credit next to theirs (as the Dockerfile does) is fine.

## Order sync (website -> Books)
Paid website orders are recorded as income transactions (Banking > Transactions), not
invoices, so the invoice limit is never touched. Code: `lib/books.ts`.
- Runs when an order is marked paid (M-Pesa callback, card payment, admin "mark paid").
- `/api/cron/books-sync` re-checks every night and backs the "Sync orders now" button.
- The order number is the transaction number, so nothing is ever recorded twice.
- Vercel variables: `BOOKS_API_URL`, `BOOKS_API_EMAIL`, `BOOKS_API_PASSWORD`, `BOOKS_SYNC_TOKEN`.
  If the Books password for that user changes, update `BOOKS_API_PASSWORD` and redeploy.
