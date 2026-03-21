/**
 * Syncs the version from package.json to tauri.conf.json and Cargo.toml.
 * Triggered automatically by the npm "version" lifecycle hook.
 * Usage: npm version patch|minor|major
 */
import { readFileSync, writeFileSync } from "fs"

const version = JSON.parse(readFileSync("package.json", "utf8")).version

// Sync tauri.conf.json
const tauriConf = readFileSync("src-tauri/tauri.conf.json", "utf8")
writeFileSync(
  "src-tauri/tauri.conf.json",
  tauriConf.replace(/"version": "[^"]+"/, `"version": "${version}"`)
)

// Sync Cargo.toml (only the package version, not dependency versions)
const cargo = readFileSync("src-tauri/Cargo.toml", "utf8")
writeFileSync(
  "src-tauri/Cargo.toml",
  cargo.replace(/^version = "[^"]+"/m, `version = "${version}"`)
)

console.log(`Synced version ${version} to tauri.conf.json and Cargo.toml`)
