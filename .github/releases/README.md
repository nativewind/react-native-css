# RC publication

The existing Release & Publish to NPM workflow accepts `rc`, an exact RC version, and a publication checkbox. An unchecked publication checkbox runs authentication and archive preflight only. Stable and preview releases continue to use release-it.

Each RC has a reviewed JSON descriptor in this directory. It identifies the merged source commit, package version, archive checksums, and Expo consumer dependencies. The exact audited archive is attached to a draft GitHub prerelease whose tag is the package version and whose target is the recorded source commit.

The RC job verifies the descriptor and archive, then publishes the archive under `rc-staging` without rebuilding. An existing npm version is accepted only when its integrity matches. The job downloads the registry archive, verifies both checksums, installs the exact version in a fresh Expo consumer, and runs the engine Node tooling tests against that installation. It checks that only one engine runtime is installed.

After those checks pass, the job advances `rc`, verifies that `latest` is unchanged, and makes the GitHub prerelease public. A failed run retains its publication receipt. Retries accept an already published matching archive and repeat the registry checks before advancing `rc`.

The runner uses the existing `NPM_TOKEN` secret. Authentication is checked before the publication step. Registry authentication failures require fixing the repository's npm publishing credential.
