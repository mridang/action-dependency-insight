# =================================================================
# File: test/checkers/python/Dockerfile
# Description: This optimized Dockerfile installs Python dependencies
#              in a cached layer for faster builds.
# =================================================================

FROM python:3.9-slim

# Install poetry system-wide, which is the dependency manager.
RUN pip install "poetry>=1.2.0"

# Set the working directory for all subsequent commands.
WORKDIR /app

# Copy the Poetry manifest and lock file first. This allows Docker
# to cache the result of the `poetry install` step. This layer
# will only be invalidated if these specific files change.
COPY pyproject.toml ./

# Install project dependencies using Poetry.
# --no-root: Prevents installing the project itself as a package.
# --no-interaction: Prevents any interactive prompts.
RUN poetry install --no-root --no-interaction --all-groups

# Now, copy the rest of your application's source code.
COPY . .

# Set the default command to be executed when a container is run.
# This runs the `fawltydeps` checker via Poetry's environment.
CMD ["sh", "-c", "poetry run fawltydeps --json || true"]
