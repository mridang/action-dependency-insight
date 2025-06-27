# =================================================================
# File: tests/fixtures/projects/maven/Dockerfile
# Description: This optimized Dockerfile installs Maven dependencies
#              in a cached layer for faster builds.
# =================================================================

# Use an official Maven image with OpenJDK 17 as a base.
FROM maven:3.8.4-openjdk-17

# Set the working directory for all subsequent commands.
WORKDIR /app

# Copy the pom.xml first. This allows Docker to cache the result
# of the dependency download step. This layer will only be
# invalidated if pom.xml changes.
COPY pom.xml ./

# Download all project dependencies. The -B flag runs in non-interactive
# (batch) mode.
RUN mvn dependency:resolve

# Now, copy the rest of your application's source code.
COPY src ./src

# Set the default command. This generates the site reports (including
# dependency analysis) and then cats the result to stdout.
CMD ["sh", "-c", "mvn validate --quiet && cat target/reports/dependency-analysis.html"]
