# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

> [!IMPORTANT]  
> Scripts in this project are designed to be run in a bash environment using [Yarn](https://yarnpkg.com/) and [Corepack](https://yarnpkg.com/corepack). If you are using a different shell, you may need to adjust the commands accordingly.

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

To get started with the project, run `yarn` in the root directory to install the required dependencies for each package:

> [!NOTE]
> If you do not have Yarn v3/4 installed, you can install it via [Corepack](https://yarnpkg.com/corepack) by running: `npm install -g corepack`
> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development.

```sh
yarn init -2     # We require Yarn 4
yarn clean       # Install dependencies, rebuild the project and example app
yarn example ios # Or yarn example android
```

Once the example app is built, you can use

```sh
yarn example start       # Start Expo CLI
yarn example start:build # Rebuild the project and start Expo CLI
yarn example start:debug # Rebuild the project and start Expo CLI with debug logging
```

## Example app

The [example app](/example/) demonstrates usage of the library.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Most changes to the library's code will be reflected in the example app without a rebuild, but changes to the Metro, Babel or compiler sections will require a rebuild.

You can rebuild the library by running:

```sh
yarn build
```

**There is no rebuild watch command.** The example app should fast refresh with most code changes, but certain changes (like those to the Metro transformer or Babel plugin) will require a rebuild of the library and example app. For this reason, we recommend using the `start:*` commands to rebuild the library and start the example app server in one command.

```sh
yarn example start       # Start Expo CLI
yarn example start:build # Rebuild the project and start Expo CLI
yarn example start:debug # Rebuild the project and start Expo CLI with debug logging
```

The `yarn example start` commands are aliases for `expo start`. They accept the same arguments as `expo start`, so you can pass any Expo CLI options to them.

For example, to open the example app on a specific platform, you can use:

```sh
yarn start --ios
yarn start --android
yarn start --web

yarn start:build --ios
yarn start:build --android
yarn start:build --web
```

> [!TIP]  
> `start:build` and `start:debug` will clear the cache before starting the Expo CLI. If you are experiencing issue with `yarn example start` not reflecting your changes, try running `yarn example start:build` or `yarn example start:debug`.

### Rebuilding the example app

The example app is built using a canary version of the Expo SDK, which requires a development build. Before running the example app on a device or simulator, you need to build the app using the following command:

```sh
yarn example expo prebuild # Rerun the Expo prebuild command
yarn example ios           # Or yarn example android
```

### Testing

Remember to add tests for your pull request if possible. Run the unit tests by:

```sh
yarn test
```

> [!NOTE]
> Ignore any ExperimentalWarning: VM Modules warnings. We are using the experimental [ECMAScript Modules](https://jestjs.io/docs/ecmascript-modules)

### Debugging

Run the example via the command line with the `debug` script to enable debugging:

```sh
yarn example start:debug
```

This will print parsed CSS and style objects to the console, which can help you understand how the library processes CSS files.

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.

### Linting and tests

[ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/)

Make sure your code passes TypeScript and ESLint. Run the following to verify:

```sh
yarn typecheck
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint --fix
```

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/) with [Prettier](https://prettier.io/) for linting and formatting the code, and [Jest](https://jestjs.io/) for testing.

Our pre-commit hooks verify that the linter and tests pass when committing.

### Publishing to npm

We use [release-it](https://github.com/release-it/release-it) to make it easier to publish new versions. It handles common tasks like bumping version based on semver, creating tags and releases etc.

To publish new versions, run the following:

```sh
yarn release
```

### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: install dependencies.
- `yarn clean`: setup project by installing dependencies and rebuilding the project and example app
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with ESLint.
- `yarn test`: run unit tests with Jest.
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.

_Do not create pull requests for these reasons:_

- Changing the scripts to work in non-bash environments

## Development notes

### Metro Transformer

> [!IMPORTANT]  
> The Metro transformer does not fast refresh. After you make a change, you will need to recompile the project and restart the Metro server with a clean cache.
>
> ```bash
> # Build the project
> yarn build
>
> # Start the Metro server with a clean cache
> yarn example start --clean
> ```

Development on the Metro transformer is done by running the example project.

### Babel Plugin

> [!IMPORTANT]
> The Babel plugin does not support hot reloading. After you make a change, you will need to recompile the project and restart the Metro server with a clean cache.
>
> ```bash
> # Build the project
> yarn build
>
> # Start the Metro server with a clean cache
> yarn example start --clean
> ```

Development on the Babel plugin is done as Test-Driven Development (TDD). The tests are located in the `src/__tests__/babel` directory. You can run the tests using:

```bash
yarn test babel
```

## Development issues

### Example will not run

- If you have a nested `node_modules` directory in your example app, it may cause issues with the Metro bundler. To resolve this, you need to ensure that the dependency versions used in the example app match those in the root `package.json`.
