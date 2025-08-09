import express from "express";
import multer from "multer";
import sharp from "sharp";
import cors from "cors";
import path from "path";
import fs from "fs/promises"
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const UPLOAD_DIR = path.join(__dirname, "uploads");
const CONVERTED_DIR = path.join(__dirname, "converted");

// config multer
const upload = multer({dest: UPLOAD_DIR});

// simple logs helper
const logReq = (req) => {
  console.log(`[${new Date().toISOString}] ${req.method} ${req.url}`);
}

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  const inputPath = req.file.path;
  const outName = `${req.file.filename}.webp`;
  const outPath = path.join(__dirname, "converted", outName);


  const baseName = path.parse(req.file.originalname).name;
  

  try {
    await fs.mkdir(path.join(__dirname, "converted"), { recursive: true });

    await sharp(inputPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outPath);

    await fs.unlink(inputPath);

    res.json({ downloadUrl: `/converted/${outName}` });
  } catch (err) {
    console.error(err);
    try { await fs.unlink(inputPath); } catch(e){}
    res.status(500).json({ error: "Conversion failed" });
  }
});

app.post("/upload", upload.single("file"), (req, res) => {
  console.log("File ricevuto da server express:", req.file);
  res.json({status: "ok"});
});


app.listen(3000, () => {
  console.log("Server express avviato sulla porta 3000");
});

app.use("/converted", express(path.join(__dirname, "converted")));

