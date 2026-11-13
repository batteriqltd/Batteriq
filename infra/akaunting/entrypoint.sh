#!/bin/bash
set -e
cd /var/www/html

# Exactly one Apache MPM may be loaded (mod_php needs prefork).
rm -f /etc/apache2/mods-enabled/mpm_event.* /etc/apache2/mods-enabled/mpm_worker.*
a2enmod -q mpm_prefork >/dev/null 2>&1 || true

# Railway tells us which port to listen on.
PORT="${PORT:-80}"
sed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:[0-9]*>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# Seed the persistent volume (mounted at storage/) on first boot.
cp -an /opt/storage-skel/. storage/ 2>/dev/null || true
mkdir -p storage/framework/{sessions,views,cache/data} storage/app/uploads storage/logs bootstrap/cache
chown -R www-data:root storage bootstrap/cache

# Is the database already installed? (looks for Akaunting's migrations table)
db_state() {
  php -r '
    try {
      $pdo = new PDO("mysql:host=".getenv("DB_HOST").";port=".getenv("DB_PORT").";dbname=".getenv("DB_DATABASE"),
                     getenv("DB_USERNAME"), getenv("DB_PASSWORD"), [PDO::ATTR_TIMEOUT => 5]);
      $t = getenv("DB_PREFIX")."migrations";
      $r = $pdo->query("SHOW TABLES LIKE ".$pdo->quote($t))->fetch();
      echo $r ? "installed" : "empty";
    } catch (Throwable $e) { echo "down"; }'
}

state=down
for i in $(seq 1 30); do
  state=$(db_state)
  [ "$state" != "down" ] && break
  echo "Waiting for database... ($i)"; sleep 4
done
[ "$state" = "down" ] && { echo "Database unreachable - check DB_* variables." >&2; exit 1; }

if [ "$state" = "empty" ]; then
  : "${ADMIN_EMAIL:?ADMIN_EMAIL is required for first install}"
  : "${ADMIN_PASSWORD:?ADMIN_PASSWORD is required for first install}"
  echo "Empty database: running first-time Akaunting install..."
  APP_INSTALLED=false php artisan install \
    --db-host="$DB_HOST" --db-port="$DB_PORT" --db-name="$DB_DATABASE" \
    --db-username="$DB_USERNAME" --db-password="$DB_PASSWORD" --db-prefix="$DB_PREFIX" \
    --company-name="${COMPANY_NAME:-My Company}" --company-email="${COMPANY_EMAIL:-$ADMIN_EMAIL}" \
    --admin-email="$ADMIN_EMAIL" --admin-password="$ADMIN_PASSWORD" \
    --locale="${APP_LOCALE:-en-GB}" --no-interaction
  echo "Install finished."
else
  echo "Database already installed: applying any pending migrations..."
  php artisan migrate --force || echo "WARN: migrate reported an error" >&2
fi

# The installer writes a throwaway .env; all real config comes from Railway
# variables, so never leave secrets in a file under the web root.
rm -f .env
# From here on the web installer is permanently closed.
export APP_INSTALLED=true
unset ADMIN_PASSWORD

php artisan config:clear >/dev/null 2>&1 || true
php artisan view:clear   >/dev/null 2>&1 || true
chown -R www-data:root storage bootstrap/cache

# Laravel scheduler (recurring invoices, reminders) - every minute, as www-data.
( while true; do
    su -s /bin/sh www-data -c 'php /var/www/html/artisan schedule:run' >/dev/null 2>&1 || true
    sleep 60
  done ) &

exec docker-php-entrypoint apache2-foreground
