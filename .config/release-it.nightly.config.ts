import type { Config } from "release-it";

export default {
  git: {
    commitArgs: ["--no-verify"],
    commit: false,
    requireCommits: true,
  },
} satisfies Config;
