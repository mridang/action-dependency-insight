# =================================================================
# File: test/checkers/node/Dockerfile
# Description: This optimized Dockerfile installs Node.js dependencies
#              in a cached layer for faster builds.
# =================================================================

FROM node:20-slim

# Set the working directory inside the container.
WORKDIR /app

# Copy the package manifest and lock file first. This layer will
# only be invalidated if these specific files change, allowing Docker
# to cache the `npm install` step.
COPY package.json ./

# Install project dependencies.
RUN npm install

# Now, copy the rest of your application's source code.
COPY . .

# Set the default command to be executed. This runs the `knip`
# checker to find unused dependencies.
CMD ["npx", "knip", "--no-exit-code", "--no-progress", "--reporter", "json"]
