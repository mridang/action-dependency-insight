# Dependency Insight GitHub Action

A GitHub Action that analyzes your project dependencies to identify unused and undeclared packages across multiple programming languages. This action helps keep your projects lean and secure by highlighting dependencies that can be safely removed or need to be properly declared.

## Features

- **Multi-Language Support**: Natively supports JavaScript/TypeScript (via Knip), PHP (via composer-unused), and Python (via FawltyDeps) projects with automatic detection based on manifest files.
- **Automatic Detection**: Intelligently identifies project types by scanning for `package.json`, `composer.json`, or `pyproject.toml` files, requiring no manual configuration.
- **Precise Location Tracking**: Pinpoints the exact line and column where unused dependencies are declared, making it easy to locate and remove them.
- **Interactive Summaries**: Generates clean, actionable GitHub Actions summaries with direct links to dependency registry pages and source code locations.
- **Deep Linking**: Creates permanent links to specific lines in your manifest files for the exact commit, making it easy to see where changes need to be made.
- **Zero Configuration**: Works out of the box with sensible defaults while still allowing customization through the underlying tools' configuration files.

## Why?

- **Reduce Bundle Size**: Identify and remove unused dependencies to decrease your application's bundle size and improve performance.
- **Enhanced Security**: Minimize your attack surface by removing unnecessary dependencies that could introduce vulnerabilities.
- **Improved Maintenance**: Keep your dependency list clean and manageable, making it easier to track what your project actually uses.
- **Cost Optimization**: Reduce build times and storage costs by eliminating unnecessary packages from your builds.
- **Compliance**: Ensure all used dependencies are properly declared, helping with license compliance and dependency auditing.

## Usage

To use this action, add it to your workflow file after your dependency installation steps (e.g., in `.github/workflows/ci.yml`).

```yaml
name: Dependency Analysis

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  analyze-dependencies:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # Install your dependencies first
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Analyze Dependencies
        uses: mridang/action-dependency-insight@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          working-directory: ./
```

### Multi-Language Project Example

For projects with multiple languages, the action will automatically detect and analyze all supported manifest files:

```yaml
name: Multi-Language Dependency Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  analyze-dependencies:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # Setup for JavaScript/TypeScript
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install npm dependencies
        run: npm ci

      # Setup for PHP
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.1'
          tools: composer

      - name: Install Composer dependencies
        run: composer install --no-dev --optimize-autoloader

      # Setup for Python
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Install Poetry
        uses: snok/install-poetry@v1

      - name: Install Python dependencies
        run: poetry install

      - name: Analyze Dependencies
        uses: mridang/action-dependency-insight@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          working-directory: ./
```

### Configuring Dependency Analysis Tools

This action uses well-established tools under the hood. You can configure their behavior by adding configuration files to your project:

- **[Knip](https://knip.dev/overview/configuration)** (JavaScript/TypeScript): Configure via `knip.json`, `knip.config.js`, or add a `knip` section to your `package.json`.

  ```json
  {
    "entry": ["src/index.ts", "scripts/*.js"],
    "ignore": ["**/*.test.ts", "build/**"],
    "ignoreDependencies": ["@types/*"]
  }
  ```

- **[composer-unused](https://github.com/icanhazstring/composer-unused#configuration)** (PHP): Configure via `composer-unused.php` configuration file.

  ```php
  // composer-unused.php
  <?php

  declare(strict_types=1);

  use ComposerUnused\ComposerUnused\Configuration\Configuration;
  use ComposerUnused\ComposerUnused\Configuration\NamedFilter;

  return static function (Configuration $config): Configuration {
      return $config
          ->addNamedFilter(NamedFilter::fromString('symfony/console'))
          ->setAdditionalFilesFor('vendor/bin', [__DIR__ . '/bin'])
          ->addPatternFilter('/^ext-/');
  };
  ```

- **[FawltyDeps](https://github.com/trailofbits/fawltydeps#configuration)** (Python): Configure via `pyproject.toml` or command-line options.

  ```toml
  # pyproject.toml
  [tool.fawltydeps]
  code = ["src"]
  deps = ["pyproject.toml"]
  ignore_unused = ["requests", "click"]
  ignore_undeclared = ["typing_extensions"]
  ```

- **Maven** (Java): While not directly supported by this action, you can use Maven's dependency analysis plugins to generate reports that follow similar patterns:

  ```xml
  <!-- pom.xml -->
  <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-dependency-plugin</artifactId>
      <version>3.2.0</version>
      <executions>
          <execution>
              <id>analyze-dependencies</id>
              <goals>
                  <goal>analyze-only</goal>
              </goals>
              <configuration>
                  <failOnWarning>false</failOnWarning>
                  <ignoreNonCompile>true</ignoreNonCompile>
              </configuration>
          </execution>
      </executions>
  </plugin>
  ```

### Inputs

- `github-token` (required): GitHub token used to authenticate API requests for creating annotations and summaries. Use `${{ secrets.GITHUB_TOKEN }}` for standard workflows.
- `working-directory` (optional, default: `'.'`): The directory to analyze. Useful for monorepos or when your manifest files are not in the repository root.

### Outputs

The action provides results through:

- **GitHub Actions Annotations**: Inline comments on specific lines where unused dependencies are found
- **Job Summary**: A comprehensive table showing all findings with links to package registries and source locations
- **Console Output**: Colored table output for local debugging and CI logs

## Supported Languages & Tools

| Language              | Manifest File    | Tool Used                                                           | Detects                                                  |
| --------------------- | ---------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| JavaScript/TypeScript | `package.json`   | [Knip](https://knip.dev)                                            | Unused dependencies, devDependencies, files, and exports |
| PHP                   | `composer.json`  | [composer-unused](https://github.com/icanhazstring/composer-unused) | Unused Composer packages                                 |
| Python                | `pyproject.toml` | [FawltyDeps](https://github.com/trailofbits/fawltydeps)             | Unused and undeclared dependencies                       |

## Known Issues

- **Build Dependencies**: Some tools may not detect dependencies that are only used during build processes or in generated code. Configure the underlying tools to include these scenarios.
- **Dynamic Imports**: Dependencies loaded dynamically at runtime might be flagged as unused. Use the tools' configuration options to exclude these packages.
- **Monorepo Limitations**: While the action supports analyzing multiple manifest files, it doesn't currently aggregate results across workspaces. Each manifest file is analyzed independently.
- **Tool Installation**: The underlying analysis tools must be available in the workflow environment. Ensure they're installed as part of your dependency installation steps.

## Troubleshooting

If you encounter inaccurate results:

1. **Run Locally**: Test the underlying tools directly in your development environment:

   ```bash
   # For JavaScript/TypeScript
   npx knip

   # For PHP
   ./vendor/bin/composer-unused

   # For Python
   poetry run fawltydeps
   ```

2. **Check Configuration**: Review the configuration options for the relevant tool and add appropriate config files to fine-tune the analysis.

3. **Review Tool Documentation**: Each tool has specific configuration options for handling edge cases:
   - [Knip Configuration](https://knip.dev/overview/configuration)
   - [composer-unused Configuration](https://github.com/icanhazstring/composer-unused#configuration)
   - [FawltyDeps Configuration](https://github.com/trailofbits/fawltydeps#configuration)

## Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions): The official documentation for GitHub Actions.
- [Dependency Management Best Practices](https://docs.npmjs.com/cli/v7/configuring-npm/package-json): Guidelines for managing project dependencies.
- [Software Supply Chain Security](https://slsa.dev/): Framework for securing software supply chains.

## Contributing

If you have suggestions for how this action could be improved, or want to report a bug, open an issue—we'd love all and any contributions.

For issues specific to the underlying analysis tools, please report them to the respective tool repositories:

- [Knip Issues](https://github.com/webpro/knip/issues)
- [composer-unused Issues](https://github.com/icanhazstring/composer-unused/issues)
- [FawltyDeps Issues](https://github.com/trailofbits/fawltydeps/issues)

## License

Apache License 2.0 © 2025 Mridang Agarwalla
