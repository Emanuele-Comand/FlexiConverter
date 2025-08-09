import Dropzone from "dropzone";

let acceptedTypes = null;

const previewIcons = ["fa fa-solid fa-2x fa-image", "fa fa-solid fa-2x fa-music", "fa fa-solid fa-2x fa-file"]

async function loadAcceptedTypes() {
  try {
    const res = await fetch("/acceptedTypes.json"); 
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    acceptedTypes = await res.json();
    console.log("acceptedTypes caricati:", acceptedTypes);
  } catch (err) {
    console.error("Impossibile caricare acceptedTypes.json.", err);
    acceptedTypes = {
      text: ["text/plain", "text/csv", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
      images: ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "image/x-icon", "image/bmp", "image/tiff"],
      audio: ["audio/mpeg", "audio/vnd.wave", "audio/aac", "audio/flac", "audio/ogg", "audio/x-s-wma", "audio/aiff", "audio/midi"]
    };
  }
}

fetch("/acceptedTypes.json")
  .then(res => res.json())
  .then(data => console.log("Questi sono i mime type", data));

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
        <i class="fa fa-solid fa-2x fa-image"></i>
        <span data-dz-name></span>
        <i id="delete-file" class="fa fa-solid fa-2x fa-trash"></i>
        </div>
      </div>
      <div class="options-container">
        <label class="convert-label">Convert to:</label>
        <!-- la select verrà inserita qui dinamicamente -->
      </div>
      <button type="button" class="convert-btn">Convert</button>
    </div>
  `;


  let myDropzone = new Dropzone("#my-form", {
    url: "http://localhost:3000/upload",
    clickable: ["#my-form", ".message-container", ".form-icon"],
    maxFilesize: 100,
    previewTemplate,
    thumbnailWidth: 120,
    thumbnailHeight: 120,
    init() {
      this.on("success", (file, resp) => {
        console.log("Server response:", resp);
        if (resp.downloadUrl) {
          const a = document.createElement("a");
          a.href = resp.downloadUrl;
          a.textContent = "Download converted file";
          a.download = "";
          a.classList.add("download-btn");
          document.body.appendChild(a);
        }
      });
      this.on("error", (file, err) => console.error(err));
    }
  });

  myDropzone.on("addedfile", file => {
    console.log(`Added file: ${file.name}`);
    console.log(file);

    function renderSelection(file) {
      const select = document.createElement("select");
      select.className = "extension";
      const opt = (v) => { const o = document.createElement("option"); o.value = v; o.textContent = v; return o; };

      const mime = file?.type || "";
      const ext = (file?.name?.split(".").pop() || "").toLowerCase();

      const imageExts = ["png","jpg","jpeg","gif","webp","svg","ico","bmp","tiff"];
      const textExts  = ["txt","csv","pdf","doc","docx","xls","xlsx","ppt","pptx"];
      const audioExts = ["mp3","wav","flac","aac","ogg","midi","aiff","wma"];

      if (mime && acceptedTypes?.images?.includes(mime)) {
        [".png", ".jpg", ".webp", ".svg"].forEach(v => select.appendChild(opt(v)));
        return select;
      } else if (mime && acceptedTypes?.text?.includes(mime)) {
        [".txt", ".csv", ".pdf", ".docx"].forEach(v => select.appendChild(opt(v)));
        return select;
      } else if (mime && acceptedTypes?.audio?.includes(mime)) {
        [".mp3", ".wav", ".flac"].forEach(v => select.appendChild(opt(v)));
        return select;
      }

      if (imageExts.includes(ext)) {
        [".png", ".jpg", ".webp", ".svg"].forEach(v => select.appendChild(opt(v)));
        return select;
      } else if (textExts.includes(ext)) {
        [".txt", ".csv", ".pdf", ".docx"].forEach(v => select.appendChild(opt(v)));
        return select;
      } else if (audioExts.includes(ext)) {
        [".mp3", ".wav", ".flac"].forEach(v => select.appendChild(opt(v)));
        return select;
      }

      [".png", ".jpg", ".webp"].forEach(v => select.appendChild(opt(v)));
      return select;
    }

    const previewEl = file.previewElement;
    if (previewEl) {
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
    }

    const convertBtn = previewEl ? previewEl.querySelector(".convert-btn") : document.querySelector(".convert-btn");
    if (convertBtn) {
      convertBtn.replaceWith(convertBtn.cloneNode(true));
      const freshBtn = previewEl ? previewEl.querySelector(".convert-btn") : document.querySelector(".convert-btn");

      freshBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sel = previewEl ? previewEl.querySelector("select.extension") : document.querySelector("select.extension");
        if (sel) {
          file.convertTo = sel.value;
        }
        log(file);
      });
    }
  });
};

export default DropzoneComponent;

