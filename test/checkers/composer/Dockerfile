# =================================================================
# File: docker/php/Dockerfile
# Description: This optimized Dockerfile installs dependencies,
#              disables deprecation warnings, and ensures clean
#              JSON output for the composer-unused checker.
# =================================================================

FROM composer:2

# Set the working directory for all subsequent commands.
WORKDIR /app

# Copy only the dependency manifest files first for caching.
COPY composer.json ./

# Install all project dependencies.
RUN composer install --no-interaction --no-scripts --no-autoloader

# Now, copy the rest of your application's source code.
# The path is relative to the build context.
COPY . .

# Finally, generate the optimized autoloader.
RUN composer dump-autoload --optimize

# Set the default command. It runs composer-unused and redirects
# the stderr stream (where the progress bar is printed) to /dev/null,
# leaving only the clean JSON on stdout. The -d flag sets a php.ini
# value inline to disable deprecation warnings.
CMD ["sh", "-c", "php -d error_reporting='E_ALL & ~E_DEPRECATED' ./vendor/bin/composer-unused --no-progress --ignore-exit-code --output-format=json 2>/dev/null"]

