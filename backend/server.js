import express from "express";
import multer from "multer";
import sharp from "sharp";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const UPLOAD_DIR = path.join(__dirname, "uploads");
const CONVERTED_DIR = path.join(__dirname, "converted");

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use("/converted", express.static(CONVERTED_DIR));

const upload = multer({ dest: UPLOAD_DIR });

async function ensureDirs() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(CONVERTED_DIR, { recursive: true });
}
ensureDirs().catch((err) => {
  console.error("Impossibile creare le directory:", err);
  process.exit(1);
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  const inputPath = req.file.path;
  const outName = `${req.file.filename}.webp`;
  const outPath = path.join(CONVERTED_DIR, outName);

  try {
    await sharp(inputPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outPath);

    await fs.unlink(inputPath).catch(() => {});

    const origin = `${req.protocol}://${req.get("host")}`;
    const downloadUrl = `${origin}/converted/${outName}`;

    return res.json({ downloadUrl });
  } catch (err) {
    console.error("Conversion failed:", err);
    try {
      await fs.unlink(inputPath);
    } catch (e) {}
    return res.status(500).json({ error: "Conversion failed" });
  }
});

// ascolta
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server express avviato sulla porta ${PORT}`);
});
