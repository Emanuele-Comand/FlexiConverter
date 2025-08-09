import Dropzone from "dropzone";


const DropzoneComponent = () => {

function log() {
console.log("Convert cliccato")
}

Dropzone.autoDiscover = false;
const previewTemplate = `
    <div class="dz-preview custom-dz-preview preview-container nata-sans">
      <div class="dz-image"><img data-dz-thumbnail alt="thumbnail" /></div>
      <div class="dz-details">
        <div class="dz-filename"><span data-dz-name></span></div>
      </div>
      <div class="options-container">
        <label for="extension">Convert to:</label>

      </div>
      <button type="button" class="convert-btn">Convert</button>
    </div>
  `;


let myDropzone = new Dropzone("#my-form", {
  url: "http://localhost:3000/upload",
  clickable: ["#my-form", ".message-container", ".form-icon"],
  maxFilesize: 100,
  acceptedFiles: "image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
    console.log(file)

    function renderSelection() {
      const select = document.createElement("select");
      select.className = "extension";
      const opt = (v) => {const o = document.createElement("option"); o.value = v; o.textContent = v; return o};
      if(file.type === "image/png" || file.type === "image/jpeg" ||file.type === "image/webp" || file.type === "image/svg+xml") {    
        select.appendChild(opt(".png"));
        select.appendChild(opt(".jpg"));
        select.appendChild(opt(".webp"));
        select.appendChild(opt(".svg"));
      }
    }

  const convertBtn = document.querySelector(".convert-btn")

  convertBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    log(file)
  });
});
}

export default DropzoneComponent;
