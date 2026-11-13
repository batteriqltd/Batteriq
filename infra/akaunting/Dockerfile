# Akaunting (GPL-3.0) for Railway. Based on the official akaunting/docker image,
# with the release pinned so upgrades are deliberate: bump AKAUNTING_VERSION,
# take a backup, then `railway up`.
FROM php:8.2-apache

ARG AKAUNTING_VERSION=3.3.1

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    imagemagick libfreetype6-dev libicu-dev libjpeg62-turbo-dev libonig-dev \
    libpng-dev libssl-dev libxml2-dev libxrender1 libzip-dev locales openssl \
    unzip zip zlib1g-dev default-mysql-client \
 && apt-get clean && rm -rf /var/lib/apt/lists/* \
 && sed -i 's/^# en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j"$(nproc)" gd bcmath intl mbstring pcntl pdo pdo_mysql zip

RUN curl -fLo /tmp/akaunting.zip \
      "https://github.com/akaunting/akaunting/releases/download/${AKAUNTING_VERSION}/Akaunting_${AKAUNTING_VERSION}-Stable.zip" \
 && unzip -q /tmp/akaunting.zip -d /var/www/html \
 && rm -f /tmp/akaunting.zip

# Railway terminates TLS at its edge proxy. Trust it so Laravel sees https
# and does not generate http:// asset links (mixed content / broken login).
RUN sed -i 's/protected \$proxies;/protected $proxies = "*";/' \
      /var/www/html/app/Http/Middleware/TrustProxies.php \
 && grep -q 'proxies = "\*"' /var/www/html/app/Http/Middleware/TrustProxies.php

# Production PHP settings + Apache hardening.
COPY hardening.conf /etc/apache2/conf-available/zz-hardening.conf
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
 && { echo 'upload_max_filesize=20M'; echo 'post_max_size=25M'; echo 'memory_limit=256M'; \
      echo 'expose_php=Off'; echo 'session.cookie_secure=On'; echo 'session.cookie_httponly=On'; \
      echo 'variables_order=EGPCS'; } > "$PHP_INI_DIR/conf.d/zz-akaunting.ini" \
 && a2enconf zz-hardening && a2enmod rewrite headers

# The Railway volume is mounted over storage/, hiding what the zip shipped.
# Keep a copy so the entrypoint can seed an empty volume.
RUN cp -a /var/www/html/storage /opt/storage-skel \
 && chown -R www-data:root /var/www/html

COPY entrypoint.sh /usr/local/bin/akaunting-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/akaunting-entrypoint.sh \
 && chmod +x /usr/local/bin/akaunting-entrypoint.sh

WORKDIR /var/www/html
ENTRYPOINT ["/usr/local/bin/akaunting-entrypoint.sh"]
