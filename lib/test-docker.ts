import docker from "./docker";

const repoUrl = "https://github.com/octocat/Hello-World.git";

async function cloneRepository() {
  let container;

  try {
    console.log("🐳 Creating container...");

    container = await docker.createContainer({
      Image: "github-analyzer-runner:latest",

      Cmd: [
        "sh",
        "-c",
        `
        git clone "${repoUrl}" /workspace/repo &&
        echo "===== REPOSITORY FILES =====" &&
        ls -la /workspace/repo
        `
      ],

      Tty: false,
    });

    console.log("Container created!");

    await container.start();

    console.log("Container started!");
    console.log("Cloning repository...");

    const result = await container.wait();

    console.log("Exit code:", result.StatusCode);

    // Container ke logs nikaalna
    const logs = await container.logs({
      stdout: true,
      stderr: true,
    });

    console.log("\n📂 Container output:");
    console.log(logs.toString());

  } catch (error) {
    console.error("❌ Error:");

    if (error instanceof Error) {
      console.error(error.message);
    }
  }
}

cloneRepository();