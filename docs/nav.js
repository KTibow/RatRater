import { analyzeZip } from "./analyzeZip.js";
import JSZip from "https://esm.run/jszip";
document.querySelector("#filePicker").addEventListener("change", (e) => {
  document.querySelector("#analysis").style.visibility = "visible";
  document.querySelector("#analysis").style.opacity = "1";
  document.querySelector("main").innerHTML = "Loading...";
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.readAsArrayBuffer(file);
  reader.onload = async (e) => {
    const data = e.target.result;
    let zip;
    try {
      zip = await new JSZip().loadAsync(data);
    } catch (e) {
      alert("Something went wrong. It might not be a valid jar.");
      console.error(e);
    }
    analyzeZip(zip, file.name, data);
  };
});
document.body.addEventListener(
  "dragover",
  (e) => {
    document.querySelector("#dropSpace").style.visibility = "visible";
    document.querySelector("#dropSpace").style.opacity = "1";
    e.preventDefault();
  },
  false
);
document.body.addEventListener(
  "dragleave",
  (e) => {
    document.querySelector("#dropSpace").style.visibility = "hidden";
    document.querySelector("#dropSpace").style.opacity = "0";
    e.preventDefault();
  },
  false
);
document.body.addEventListener("drop", (e) => {
  e.preventDefault();
  document.querySelector("#dropSpace").style.visibility = "hidden";
  document.querySelector("#dropSpace").style.opacity = "0";
  document.querySelector("#analysis").style.visibility = "visible";
  document.querySelector("#analysis").style.opacity = "1";
  document.querySelector("main").innerHTML = "Loading...";
  const file = e.dataTransfer.files[0];
  const reader = new FileReader();
  reader.readAsArrayBuffer(file);
  reader.onload = async (e) => {
    const data = e.target.result;
    let zip;
    try {
      zip = await new JSZip().loadAsync(data);
    } catch (e) {
      alert("Something went wrong. It might not be a valid jar.");
      console.error(e);
    }
    analyzeZip(zip, file.name);
  };
});
