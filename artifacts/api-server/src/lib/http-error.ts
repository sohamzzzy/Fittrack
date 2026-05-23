import type { Request, Response } from "express";

export function sendServerError(req: Request, res: Response, err: unknown): void {
  req.log.error(err);

  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";

  const body: { error: string; detail?: string } = { error: "Internal server error" };
  if (process.env.NODE_ENV !== "production") {
    body.detail = message;
  }

  res.status(500).json(body);
}
