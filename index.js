const command = process.argv[2];

if (!command) {
  console.error("Error: No command specified");
  console.error("Usage: node index.js <command>");
  console.error("Available commands: duplicate, insert");
  process.exit(1);
}

switch (command) {
  case "duplicate":
    require("./lib/duplicate").run();
    break;
  case "insert":
    require("./lib/insert").run();
    break;
  default:
    console.error(`Error: Unknown command "${command}"`);
    console.error("Available commands: duplicate, insert");
    process.exit(1);
}
