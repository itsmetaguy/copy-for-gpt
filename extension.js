const vscode = require("vscode");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path"); 


const GPT_IGNORE_CONTENT = `# .gptignore
# ----------------------------------------------
# Files and folders listed here will NOT be
# copied when using Copy For GPT.
#
# Similar to .gitignore, one rule per line.
#
# Paths are relative to the project root.
# ----------------------------------------------
# Your own ignored files & folders & extensions
# ----------------------------------------------





# -----------------------------
# Dependencies
# -----------------------------
node_modules
package-lock.json
yarn.lock
pnpm-lock.yaml

# -----------------------------
# Build / output
# -----------------------------
dist
build
.out
.next
.cache
coverage
.nyc_output

# -----------------------------
# Environment
# -----------------------------
.env
.env.*

# -----------------------------
# Logs / maps
# -----------------------------
*.log
*.map

# -----------------------------
# VCS
# -----------------------------
.git
.gitignore
.gitattributes

# -----------------------------
# VS Code / tooling
# -----------------------------
.vscode
.vscode/**
.vscodeignore
.vscode-test.mjs
vsc-extension-quickstart.md
eslint.config.mjs
jsconfig.json

# -----------------------------
# Tests (optional, noise for GPT)
# -----------------------------
test
test/**
tests
tests/**

# -----------------------------
# Images
# -----------------------------
*.png
*.jpg
*.jpeg
*.gif
*.ico
*.webp
*.avif
*.bmp
*.tiff

# -----------------------------
# Audio / Video
# -----------------------------
*.mp3
*.wav
*.flac
*.ogg
*.m4a
*.mp4
*.avi
*.mov
*.mkv
*.webm

# -----------------------------
# Fonts
# -----------------------------
*.woff
*.woff2
*.ttf
*.otf
*.eot

# -----------------------------
# Archives
# -----------------------------
*.zip
*.rar
*.7z
*.tar
*.gz
*.tgz
*.bz2

# -----------------------------
# Binaries / executables
# -----------------------------
*.vsix
*.exe
*.dll
*.so
*.dylib
*.app
*.msi
*.bin

# -----------------------------
# Documents / data (binary)
# -----------------------------
*.pdf
*.db
*.sqlite
*.sqlite3
*.dat
`;


function ensureGptIgnore(cwd) {
  const filePath = path.join(cwd, ".gptignore");

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, GPT_IGNORE_CONTENT, "utf8");
    return true; // créé
  }

  return false; // existait déjà
}

function runCopy(command, cwd, label, gptIgnoreCreated) {
  const status = vscode.window.setStatusBarMessage(
    label === "quick"
      ? "⚡ Copying project for GPT..."
      : "📋 Copying project for GPT..."
  );

  exec(command, { cwd }, (err, stdout, stderr) => {
    status.dispose();

    if (err) {
      console.error("EXEC ERROR:", err);
      console.error("STDERR:", stderr);

      vscode.window.showErrorMessage(
        `Copy For GPT failed ❌\n${stderr || err.message}`
      );
      return;
    }

    const match = stdout?.match(/(\d+)\s+fichiers copiés/i);
    const count = match ? match[1] : "?";

    let message = `✅ Copied ${count} files for GPT • Root: ${path.basename(cwd)}`;
    if (gptIgnoreCreated) message += "\n• .gptignore created and applied";

    vscode.window.showInformationMessage(message);
  });
}

async function activate(context) {

  // ⚡ QUICK
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "copy-for-gpt.quick",
      async (uri) => {
        if (!uri?.fsPath) return;

        const cwd = uri.fsPath;

        ensureGptIgnore(cwd);
        runCopy("copy-gpt --tree --files", cwd, "quick", false);
      }
    )
  );

  // 🧠 CUSTOM
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "copy-for-gpt.custom",
      async (uri) => {
        if (!uri?.fsPath) return;

        const cwd = uri.fsPath;

        let command = "copy-gpt";
        

        // 1️⃣ What to copy
        const contentMode = await vscode.window.showQuickPick(
          ["Both", "Tree only", "Files only"],
          { placeHolder: "What do you want to copy?" }
        );
        if (!contentMode) return;

        let extArg = "";

        // 2️⃣ Extensions if needed
        if (contentMode !== "Tree only") {
          const extInput = await vscode.window.showInputBox({
            placeHolder: "Extensions (ex: js,html,css) — leave empty for all"
          });

          if (extInput?.trim()) {
            extArg = ` --ext=${extInput.replace(/\s/g, "")}`;
          }
        }

                // 3️⃣ Max file size (optional)
        const maxSizeInput = await vscode.window.showInputBox({
          placeHolder: "Max file size in KB (ex: 300) — leave empty for default",
          validateInput: (value) => {
            if (!value) return null;
            return /^\d+$/.test(value) ? null : "Please enter a number";
          }
        });

        let maxSizeArg = "";
        if (maxSizeInput?.trim()) {
          maxSizeArg = ` --max-size=${maxSizeInput}`;
        }

        // 3️⃣ Build command
        if (contentMode === "Tree only") {
          command += ` --tree`;
        }

        if (contentMode === "Files only") {
          command += ` --files${extArg}${maxSizeArg}`;
        }

        if (contentMode === "Both") {
          command += ` --tree --files${extArg}${maxSizeArg}`;
        }

        ensureGptIgnore(cwd);
        runCopy(command, cwd, "custom", false);
      }
    )
  );

  // 🎯 SELECTED FILES
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "copy-for-gpt.selection",
      async (uri, selectedUris) => {

        // VS Code may pass either one uri or an array
        const uris = selectedUris?.length ? selectedUris : [uri];
        if (!uris?.length) return;

        const files = uris
          .filter(u => u?.scheme === "file")
          .map(u => u.fsPath);

        if (!files.length) {
          vscode.window.showWarningMessage("No files selected.");
          return;
        }

        // Use the folder of the first file as cwd
        const cwd = path.dirname(files[0]);

        ensureGptIgnore(cwd);

        // Quote paths in case of spaces
        const quotedFiles = files.map(f => `"${f}"`).join(" ");

        const command = `copy-gpt --files ${quotedFiles}`;

        runCopy(command, cwd, "selection", false);
      }
    )
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
