import app from "../dist/index.mjs";

export default function handler(req, res) {
  return app(req, res);
}