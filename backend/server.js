import express from "express";
import multer from "multer";
import sharp from "sharp";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import ffmpeg from "fluent-ffmpeg";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { execFile } from "child_process";

const execFileP = promisify(execFile);
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

// Route di download deve venire PRIMA dei file statici
app.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;
  console.log("Download route chiamata per:", filename);

  if (path.basename(filename) !== filename) {
    return res.status(400).end("Invalid filename");
  }

  const filePath = path.join(CONVERTED_DIR, filename);

  // Verifica che il file esista
  fs.access(filePath)
    .then(() => {
      // Imposta gli header per forzare il download
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Type", "application/octet-stream");
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Download error:", err);
          res.status(err.code === "ENOENT" ? 404 : 500).end();
        }
      });
    })
    .catch(() => {
      res.status(404).json({ error: "File not found" });
    });
});

// Rimuoviamo la route statica per evitare conflitti con il download
// app.use("/converted", express.static(CONVERTED_DIR));

const upload = multer({ dest: UPLOAD_DIR });

async function ensureDirs() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(CONVERTED_DIR, { recursive: true });
}
await ensureDirs().catch((err) => {
  console.error("Impossibile creare le directory:", err);
  process.exit(1);
});

const IMAGE_FORMAT_MAP = {
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  webp: "webp",
  tiff: "tiff",
  avif: "avif",
  gif: "gif",
  heif: "heif",
};

async function convertImageSharp(
  inputPath,
  outPath,
  targetFormat = "webp",
  options = {}
) {
  const requested = (targetFormat || "webp").replace(/^\./, "").toLowerCase();
  const fmt = IMAGE_FORMAT_MAP[requested] || requested;

  const supported = sharp.format || {};
  const canOutput = !!(supported[fmt] && supported[fmt].output);
  if (!canOutput) {
    throw new Error(`Formato di output non supportato da sharp: ${fmt}`);
  }

  const defaults = {
    jpeg: { quality: 80, chromaSubsampling: "4:2:0" },
    png: { compressionLevel: 9, progressive: false },
    webp: { quality: 80 },
    tiff: { quality: 80 },
    avif: { quality: 50 },
    heif: { quality: 50 },
    gif: {},
  };
  const opts = { ...(defaults[fmt] || {}), ...(options || {}) };

  let pipeline = sharp(inputPath);
  if (!opts.skipResize)
    pipeline = pipeline.resize({ width: 1200, withoutEnlargement: true });

  switch (fmt) {
    case "jpeg":
      await pipeline.jpeg(opts).toFile(outPath);
      break;
    case "png":
      await pipeline.png(opts).toFile(outPath);
      break;
    case "webp":
      await pipeline.webp(opts).toFile(outPath);
      break;
    case "tiff":
      await pipeline.tiff(opts).toFile(outPath);
      break;
    case "avif":
      await pipeline.avif(opts).toFile(outPath);
      break;
    case "heif":
      await pipeline.heif(opts).toFile(outPath);
      break;
    case "gif":
      await pipeline.gif(opts).toFile(outPath);
      break;
    default:
      if (typeof pipeline[fmt] === "function") {
        await pipeline[fmt](opts).toFile(outPath);
      } else {
        throw new Error(`Conversione a formato ${fmt} non implementata`);
      }
  }
}

function convertAudioFFmpeg(inputPath, outPath, format = "mp3") {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .toFormat(format)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outPath);
  });
}

async function convertTextPandoc(inputPath, outPath) {
  await execFileP("pandoc", [inputPath, "-o", outPath]);
}

const ALLOWED_TARGETS = new Set([
  "webp",
  "jpg",
  "jpeg",
  "png",
  "tiff",
  "avif",
  "mp3",
  "ogg",
  "wav",
  "flac",
  "pdf",
  "txt",
  "html",
  "md",
]);

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  const inputPath = req.file.path;
  const originalName = req.file.originalname || "file";
  const mimetype = req.file.mimetype || "";
  const requestedTargetRaw = (req.body?.convertTo || "")
    .replace(/^\./, "")
    .toLowerCase();
  const requestedTarget = ALLOWED_TARGETS.has(requestedTargetRaw)
    ? requestedTargetRaw
    : null;

  try {
    await fs.mkdir(CONVERTED_DIR, { recursive: true });

    const ext = path.extname(originalName).toLowerCase();
    const isImage = mimetype.startsWith("image/");
    const isAudio = mimetype.startsWith("audio/");
    const isTextLike =
      mimetype.startsWith("text/") ||
      [".doc", ".docx", ".pdf", ".odt", ".rtf", ".md", ".html"].includes(ext);

    let targetFormat = requestedTarget;
    if (!targetFormat) {
      targetFormat = isImage ? "webp" : isAudio ? "mp3" : "pdf";
      if (!ALLOWED_TARGETS.has(targetFormat)) targetFormat = "txt";
    }

    const baseOutName = `${req.file.filename}`;
    const outName = `${baseOutName}.${targetFormat}`;
    const outPath = path.join(CONVERTED_DIR, outName);

    if (isImage) {
      const IMAGE_ALLOWED = new Set([
        "webp",
        "jpg",
        "jpeg",
        "png",
        "tiff",
        "avif",
        "gif",
        "heif",
      ]);
      if (!IMAGE_ALLOWED.has(targetFormat)) {
        throw new Error("Target immagine non consentito");
      }
      console.log(
        "Converting image:",
        originalName,
        "->",
        outName,
        "format:",
        targetFormat
      );
      await convertImageSharp(inputPath, outPath, targetFormat);
    } else if (isAudio) {
      console.log(
        "Converting audio:",
        originalName,
        "->",
        outName,
        "format:",
        targetFormat
      );
      await convertAudioFFmpeg(inputPath, outPath, targetFormat);
    } else if (isTextLike) {
      console.log(
        "Converting text:",
        originalName,
        "->",
        outName,
        "format:",
        targetFormat
      );
      await convertTextPandoc(inputPath, outPath);
    } else {
      const safeName = `${req.file.filename}${ext || ""}`;
      const fallbackOut = path.join(CONVERTED_DIR, safeName);
      await fs.rename(inputPath, fallbackOut);
      const origin = `${req.protocol}://${req.get("host")}`;
      return res.json({
        downloadUrl: `${origin}/download/${path.basename(fallbackOut)}`,
      });
    }

    try {
      await fs.unlink(inputPath).catch(() => {});
    } catch (e) {}

    const origin = `${req.protocol}://${req.get("host")}`;
    return res.json({ downloadUrl: `${origin}/download/${outName}` });
  } catch (err) {
    console.error("Conversion failed:", err);
    try {
      await fs.unlink(inputPath).catch(() => {});
    } catch (e) {}
    return res
      .status(500)
      .json({ error: "Conversion failed", details: err?.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server express avviato sulla porta ${PORT}`);
});
