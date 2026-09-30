import { NextRequest, NextResponse } from "next/server";
import docker from "@/lib/docker";

export async function POST(request: NextRequest) {
  let container;

  try {
    const body = await request.json();
    const repoUrl = body.repoUrl;

    if (!repoUrl) {
      return NextResponse.json(
        { error: "GitHub repository URL is required" },
        { status: 400 }
      );
    }

    console.log("Repository URL:", repoUrl);

    // Container create
    container = await docker.createContainer({
      Image: "github-analyzer-runner:latest",

      // Cmd: [
      //       "git",
      //       "clone",
      //       repoUrl,// 
      //       "/workspace/repo",
      //       ],
      // temporary
      Cmd: [
          "sh",
          "-c",
          `git clone "${repoUrl}" /workspace/repo && tail -f /dev/null`,
        ],
      Tty: false,
    });

    console.log("Container created:", container.id);

    // Container start
    await container.start();

    console.log("Container started");

    // Wait until clone finishes
    // const result = await container.wait();

    // console.log("Container finished");
    // console.log("Exit code:", result.StatusCode);

    // if (result.StatusCode !== 0) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: "Repository clone failed",
    //       containerId: container.id,
    //     },
    //     { status: 500 }
    //   );
    // }
    //temporary
    console.log("Repository cloned and container is still running");

return NextResponse.json({
  success: true,
  message: "Repository cloned successfully",
  containerId: container.id,
});

    return NextResponse.json({
      success: true,
      message: "Repository cloned successfully",
      containerId: container.id,
    });

  } catch (error) {
    console.error("Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}