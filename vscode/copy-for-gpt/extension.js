const vscode = require("vscode");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path"); 


function ensureGptIgnoreExists(cwd) {
  const filePath = path.join(cwd, ".gptignore");

  if (fs.existsSync(filePath)) {
    return false; // ❌ pas créé
  }

  const content = `# .gptignore
# -----------------------------------------
# Files and folders listed here will NOT be
# copied when using Copy For GPT.
#
# Similar to .gitignore, one rule per line.
#
# Examples:
# node_modules
# dist
# .env
# *.log
# *.map
#
# Paths are relative to the project root.
# -----------------------------------------
`;

  fs.writeFileSync(filePath, content, "utf8");
  return true; // ✅ créé
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

    let message = `✅ Copied ${count} files for GPT`;
    if (gptIgnoreCreated) message += " & .gptignore file created";

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

        const created = ensureGptIgnoreExists(cwd);
        runCopy("copy-gpt --tree --files", cwd, "quick", created);
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

        const created = ensureGptIgnoreExists(cwd);
        runCopy(command, cwd, "custom", created);
      }
    )
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
