import { readdirSync } from "fs";
import { join, parse } from "path";

function getFilesWithoutExtension(dirPath: string) {
  // Read all files and directories inside dirPath synchronously
  const entries = readdirSync(dirPath, { withFileTypes: true });

  // Filter only files (ignore directories)
  const files = entries.filter(
    (entry) =>
      entry.isFile() &&
      /\.[jt]sx?$/.exec(entry.name) &&
      !/index\.[jt]sx?$/.exec(entry.name),
  );

  // For each file, get the filename without extension
  const filesWithoutExt = files.map((file) => parse(file.name).name);

  return filesWithoutExt;
}

export const allowedModules = new Set(
  getFilesWithoutExtension(join(__dirname, "../components")),
);
