import Dropzone from "dropzone";

let acceptedTypes = null;

const previewIconsMap = {
  image: "fa-solid fa-2x fa-image",
  audio: "fa-solid fa-2x fa-music",
  text: "fa-solid fa-2x fa-file",
  default: "fa-solid fa-2x fa-file",
};

async function loadAcceptedTypes() {
  try {
    const res = await fetch("/acceptedTypes.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    acceptedTypes = await res.json();
    console.log("acceptedTypes caricati:", acceptedTypes);
  } catch (err) {
    console.error("Impossibile caricare acceptedTypes.json.", err);
    acceptedTypes = {
      text: [
        "text/plain",
        "text/csv",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ],
      images: [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "image/x-icon",
        "image/bmp",
        "image/tiff",
      ],
      audio: [
        "audio/mpeg",
        "audio/vnd.wave",
        "audio/aac",
        "audio/flac",
        "audio/ogg",
        "audio/x-s-wma",
        "audio/aiff",
        "audio/midi",
      ],
    };
  }
}

function getIconCategory(file) {
  const mime = file?.type || "";
  const ext = (file?.name?.split(".").pop() || "").toLowerCase();

  if (mime && acceptedTypes?.images?.includes(mime)) return "image";
  if (mime && acceptedTypes?.audio?.includes(mime)) return "audio";
  if (mime && acceptedTypes?.text?.includes(mime)) return "text";

  const imageExts = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "svg",
    "ico",
    "bmp",
    "tiff",
  ];
  const audioExts = ["mp3", "wav", "flac", "aac", "ogg", "midi", "aiff", "wma"];
  const textExts = [
    "txt",
    "csv",
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
  ];

  if (imageExts.includes(ext)) return "image";
  if (audioExts.includes(ext)) return "audio";
  if (textExts.includes(ext)) return "text";
  return "default";
}

function getIconClassForFile(file) {
  const cat = getIconCategory(file);
  return previewIconsMap[cat] || previewIconsMap.default;
}

fetch("/acceptedTypes.json")
  .then((res) => res.json())
  .then((data) => console.log("Questi sono i mime type", data));

const DropzoneComponent = async () => {
  await loadAcceptedTypes();

  function log(file) {
    console.log("Convert cliccato", file?.name);
  }

  Dropzone.autoDiscover = false;
  const previewTemplate = `
  <div class="dz-preview custom-dz-preview preview-container nata-sans">
    <div class="dz-details">
      <div class="dz-filename filename-container">
        <span class="preview-icon" data-icon></span>
        <span data-dz-name></span>
        <i class="delete-file fa fa-solid fa-2x fa-trash"></i>
      </div>
    </div>

    <div class="options-container">
      <label class="convert-label">Convert to:</label>
      <!-- select verrà inserita qui -->
    </div>

    <div class="actions-container">
      <button type="button" class="convert-btn">Convert</button>
      <a class="download-btn" download>Download</a>
    </div>
  </div>
  `;

  // autoProcessQueue false: l'upload parte solo con processFile(file)
  let myDropzone = new Dropzone("#my-form", {
    url: "http://localhost:3000/upload",
    clickable: ["#my-form", ".message-container", ".form-icon"],
    maxFilesize: 100,
    previewTemplate,
    thumbnailWidth: 120,
    thumbnailHeight: 120,
    autoProcessQueue: false,
    init() {
      // aggiungi convertTo al formData quando si invia il file
      this.on("sending", (file, xhr, formData) => {
        if (file.convertTo) {
          formData.append("convertTo", file.convertTo);
        }
      });

      // mostra progresso upload sul bottone Convert
      this.on("uploadprogress", (file, progress /* percento */) => {
        const previewEl = file.previewElement;
        if (!previewEl) return;
        const convertBtn = previewEl.querySelector(".convert-btn");
        if (convertBtn) {
          convertBtn.textContent = `Uploading ${Math.round(progress)}%`;
        }
      });

      // success handler: server restituisce downloadUrl DOPO conversione
      this.on("success", (file, resp) => {
        console.log("Server response (success):", resp);

        const downloadUrl =
          resp?.downloadUrl || resp?.download_url || resp?.url || null;

        const previewEl = file.previewElement;
        if (!previewEl) return;

        const convertBtn = previewEl.querySelector(".convert-btn");
        const dl = previewEl.querySelector(".download-btn");

        if (convertBtn) {
          // nascondi convert (ruolo scambiato)
          convertBtn.style.display = "none";
          convertBtn.disabled = false;
        }

        if (dl && downloadUrl) {
          dl.href = downloadUrl;
          dl.setAttribute("download", "");
          // forza visibilità tramite inline style (più affidabile)
          dl.style.display = "inline-flex";
          dl.classList.add("visible");
          dl.innerHTML = `<i class="fa fa-download" aria-hidden="true" style="margin-right:8px"></i>Download`;
        } else if (dl) {
          // fallback: mostra comunque il link (senza href)
          dl.style.display = "inline-flex";
          dl.textContent = "Download";
        }
      });

      this.on("error", (file, err) => {
        console.error("Upload/Conversion error:", err);
        const previewEl = file.previewElement;
        if (!previewEl) return;
        const convertBtn = previewEl.querySelector(".convert-btn");
        if (convertBtn) {
          convertBtn.disabled = false;
          convertBtn.textContent = "Convert";
        }
      });
    },
  });

  myDropzone.on("addedfile", (file) => {
    console.log(`Added file: ${file.name}`);
    console.log(file);

    function renderSelection(file) {
      const select = document.createElement("select");
      select.className = "extension";
      const opt = (v) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        return o;
      };

      const mime = file?.type || "";
      const ext = (file?.name?.split(".").pop() || "").toLowerCase();

      const imageExts = [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "svg",
        "ico",
        "bmp",
        "tiff",
      ];
      const textExts = [
        "txt",
        "csv",
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
      ];
      const audioExts = [
        "mp3",
        "wav",
        "flac",
        "aac",
        "ogg",
        "midi",
        "aiff",
        "wma",
      ];

      if (mime && acceptedTypes?.images?.includes(mime)) {
        [
          ".png",
          ".jpg",
          ".webp",
          ".svg",
          "gif",
          "webp",
          "svg",
          "ico",
          "bmp",
          "tiff",
        ].forEach((v) => select.appendChild(opt(v)));
        return select;
      } else if (mime && acceptedTypes?.text?.includes(mime)) {
        [
          ".txt",
          ".csv",
          ".pdf",
          "doc",
          ".docx",
          "xls",
          "xlsx",
          "ppt",
          "pptx",
        ].forEach((v) => select.appendChild(opt(v)));
        return select;
      } else if (mime && acceptedTypes?.audio?.includes(mime)) {
        [".mp3", ".wav", ".flac"].forEach((v) => select.appendChild(opt(v)));
        return select;
      }

      if (imageExts.includes(ext)) {
        [".png", ".jpg", ".webp", ".svg"].forEach((v) =>
          select.appendChild(opt(v))
        );
        return select;
      } else if (textExts.includes(ext)) {
        [".txt", ".csv", ".pdf", ".docx"].forEach((v) =>
          select.appendChild(opt(v))
        );
        return select;
      } else if (audioExts.includes(ext)) {
        [".mp3", ".wav", ".flac", "aac", "ogg", "aiff", "wma", "midi"].forEach(
          (v) => select.appendChild(opt(v))
        );
        return select;
      }

      [".png", ".jpg", ".webp"].forEach((v) => select.appendChild(opt(v)));
      return select;
    }

    const previewEl = file.previewElement;
    if (previewEl) {
      // render select
      const optionsContainer = previewEl.querySelector(".options-container");
      if (optionsContainer) {
        const existingLabel = optionsContainer.querySelector(".convert-label");
        if (!existingLabel) {
          optionsContainer.innerHTML = `<label class="convert-label">Convert to:</label>`;
        }
        const prevSelect = optionsContainer.querySelector("select.extension");
        if (prevSelect) prevSelect.remove();

        const sel = renderSelection(file);
        optionsContainer.appendChild(sel);
      }

      const iconEl = previewEl.querySelector("[data-icon]");
      if (iconEl) {
        const cls = getIconClassForFile(file);
        if (cls) iconEl.innerHTML = `<i class="${cls}"></i>`;
      }

      const dl = previewEl.querySelector(".download-btn");
      if (dl) {
        dl.classList.remove("visible");
        dl.style.display = "none";
        dl.textContent = "Download";
      }

      const convertBtn = previewEl.querySelector(".convert-btn");
      if (convertBtn) {
        convertBtn.replaceWith(convertBtn.cloneNode(true));
        const freshBtn = previewEl.querySelector(".convert-btn");

        freshBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          freshBtn.disabled = true;
          freshBtn.textContent = "Converting...";

          const sel = previewEl.querySelector("select.extension");
          if (sel) {
            file.convertTo = sel.value;
          }

          myDropzone.processFile(file);

          log(file);
        });
      }
    }
  });
};

export default DropzoneComponent;
