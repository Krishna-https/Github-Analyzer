import { NextRequest, NextResponse } from "next/server";
import docker from "@/lib/docker";
import { buildCloneScript } from "@/lib/docker/clone";

/**
 * Only accept canonical GitHub repo URLs (HTTPS or SSH). The URL is
 * interpolated into the shell command that runs inside the container, so
 * anything outside this shape — quotes, `$()`, `;`, extra path segments — must
 * be rejected before it can reach `sh -c`.
 */
const GITHUB_REPO_URL =
  /^(https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+|git@github\.com:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const repoUrl =
      typeof body.repoUrl === "string" ? body.repoUrl.trim().replace(/\/+$/, "") : "";

    if (!repoUrl) {
      return NextResponse.json(
        { error: "GitHub repository URL is required" },
        { status: 400 }
      );
    }

    if (!GITHUB_REPO_URL.test(repoUrl)) {
      return NextResponse.json(
        {
          error:
            "Enter a valid GitHub repository URL, e.g. https://github.com/owner/repo",
        },
        { status: 400 }
      );
    }

    console.log("Repository URL:", repoUrl);

    const container = await docker.createContainer({
      Image: "github-analyzer-runner:latest",
      Cmd: ["sh", "-c", buildCloneScript(repoUrl)],
      Tty: false,
    });

    console.log("Container created:", container.id);

    await container.start();

    console.log("Container started; clone is running in the background");

    return NextResponse.json({
      success: true,
      message: "Repository clone started",
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
