/// <reference path="base.js" />
import JSZip from "https://esm.run/jszip";
import Mark from "https://esm.run/mark.js";
/**
 *
 * @param {JSZip} zip
 * @param {string} name
 */
export const analyzeZip = async (zip, name) => {
  document.querySelector("main").innerHTML = `
    RatRater results for ${name}
    <progress id="progress" max="${zip.files.length}" value="0" class="border-revert w-full"></progress>
  `;
  const progress = document.querySelector("#progress");
  console.log(zip);
  const analyses = (
    await Promise.all(
      Object.values(zip.files)
        .filter((file) => !file.dir)
        .map(async (file) => {
          const data = await file.async("string");
          const result = await analyzeFile(data, file.name);
          progress.value++;
          return result;
        })
    )
  ).flat();
  if (zip.comment?.includes("Branchlock")) {
    analyses.push({
      match: "Branchlock",
      desc: "Obfuscated with Branchlock",
      obfuscation: true,
      file: "[part of the jar's comment]",
    });
  }
  const obfuscationResults = analyses.filter((result) => result.obfuscation);
  if (obfuscationResults.length > 0) {
    document.querySelector("main").append(html`
      <h2 class="bg-zinc-900 p-2 text-3xl rounded-md">Obfuscation</h2>
      <p>When people make the source code harder to read.</p>
    `);
    for (const result of obfuscationResults) {
      document.querySelector("main").append(createResultTag(result, zip));
    }
  }
  const uploadingResults = analyses.filter((result) => result.uploading);
  if (uploadingResults.length > 0) {
    document.querySelector("main").append(html`
      <h2 class="bg-zinc-900 p-2 text-3xl rounded-md">Uploading</h2>
      <p>When people upload your data to a server.</p>
    `);
    for (const result of uploadingResults) {
      document.querySelector("main").append(createResultTag(result, zip));
    }
  }
  const collectionResults = analyses.filter((result) => result.collection);
  if (collectionResults.length > 0) {
    document.querySelector("main").append(html`
      <h2 class="bg-zinc-900 p-2 text-3xl rounded-md">Collection</h2>
      <p>When people collect data like your session ID.</p>
    `);
    for (const result of collectionResults) {
      document.querySelector("main").append(createResultTag(result, zip));
    }
  }
  const signatureResults = analyses.filter((result) => result.signature);
  if (signatureResults.length > 0) {
    document.querySelector("main").append(html`
      <h2 class="bg-zinc-900 p-2 text-3xl rounded-md">Signatures</h2>
      <p>Marks of known rats.</p>
    `);
    for (const result of signatureResults) {
      document.querySelector("main").append(createResultTag(result, zip));
    }
  }
  document.querySelector("main").append(html`
    <p>
      That's all the results we found.
      <button
        class="bg-orange-500 hover:bg-orange-600 font-bold p-2 rounded-md"
        onclick="window.print()"
      >
        Export to doc
      </button>
    </p>
  `);
};
const createResultTag = (result, zip) => {
  const tag = html`
    <div class="bg-zinc-900 bg-opacity-40 p-4 my-4 rounded-md">
      <span class="text-xl">${result.match}</span>
      <br />
      <span class="text-sm">${result.desc}</span>
      <br />
      <span class="text-blue-400 font-bold cursor-pointer" id="sourceFile">
        From ${result.file} ${result.segment ? `(segment)` : ""}
      </span>
    </div>
  `;
  tag.querySelector("#sourceFile").addEventListener("click", async () => {
    const data = result.segment || (await zip.files[result.file].async("string"));
    const dialog = html`
      <dialog class="bg-zinc-900 bg-opacity-90 p-4 my-4 rounded-md">
        <h2 class="text-3xl">${result.file} ${result.segment ? `(segment)` : ""}</h2>
        <pre class="text-sm whitespace-pre-wrap"></pre>
        <button
          class="bg-orange-500 hover:bg-orange-600 text-white font-bold p-2 rounded-md"
          onclick="this.parentElement.close()"
        >
          Close
        </button>
      </dialog>
    `;
    dialog.querySelector("pre").textContent = data;
    const mark = new Mark(dialog.querySelector("pre"));
    result.match instanceof RegExp ? mark.markRegExp(result.match) : mark.mark(result.match);
    document.body.append(dialog);
    dialog.showModal();
  });
  return tag;
};
const flags = [
  { match: "Branchlock", desc: "Obfuscated with Branchlock", obfuscation: true },
  {
    match: /[Il]{9,}/,
    desc: "Has random long strings, like IlIlIIlllII",
    obfuscation: true,
  },
  {
    match: "https://api.anonfiles.com/upload",
    desc: "Uploading data to AnonFiles",
    uploading: true,
  },
  { match: "herokuapp.com", desc: "Using a Heroku server", uploading: true },
  { match: "media.guilded.gg", desc: "Using a Guilded webhook", uploading: true },
  {
    match: /https?:\/\/discord\.com\/api\/webhooks/,
    desc: "Using a preset Discord webhook",
    uploading: true,
  },
  { match: "Java-DiscordWebhook-BY-Gelox_", desc: "Module for Discord webhooks", uploading: true },
  {
    match: "pastebin.com/raw/",
    desc: "Reads data from Pastebin (which might be a Discord webhook)",
    uploading: true,
  },
  { match: /https?:\/\/api.breadcat.cc/, desc: "Using Breadcat's server", uploading: true },
  { match: /[Aa]vatarUrl/, desc: "Might use Discord webhooks", uploading: true },
  { match: "HWID", desc: "Might try to get your hardware ID", collection: true },
  { match: '"APPDATA"', desc: "Might try to get data from other apps", collection: true },
  { match: "createScreenCapture", desc: "Takes a photo of your screen", collection: true },
  {
    match: / ey[^]+blackboard/,
    desc: "Might try to read your session ID from the launch args",
    collection: true,
  },
  { match: "func_148254_d", desc: "Reads your session ID", collection: true },
  { match: "func_111286_b", desc: "Reads your session ID", collection: true },
  {
    match: /session.id/i,
    desc: "Mentions session IDs, this might be bad or good",
    collection: true,
  },
  {
    match: "qolskyblockmod.pizzaclient.features.misc.SessionProtection",
    desc: "Might try to stop another mod from guarding your session",
    collection: true,
  },
  {
    match: "\\Google\\Chrome\\User Data\\Default",
    desc: "Reads data from browsers like passwords",
    collection: true,
  },
  { match: /https?:\/\/checkip\.amazonaws\.com/i, desc: "Tries to get your IP", collection: true },
  {
    match: /https?:\/\/discordapp\.com\/api\/v.\/users\/@me/,
    desc: "Tries to get information about your Discord account",
    collection: true,
  },
  {
    match: /https:\/\/discord\.com\/api\/v.\/users\/@me\/billing\/payment-sources/,
    desc: "Tries to get your payment methods for Discord",
    collection: true,
  },
  {
    match: "haveibeenpwned.com",
    desc: "Tries to see what data breaches you have",
    collection: true,
  },
  { match: "CustomPayload", desc: "Signature from the rat maker CustomPayload.", signature: true },
  { match: "BreadOS/69.420", desc: "Signature from Breadcat's rats.", signature: true },
  { match: "SmolPeePeeEnergy", desc: "Signature from Breadcat's rats.", signature: true },
];
const analyzeFile = async (data, fileName) => {
  const stringsToCheck = [data, fileName];
  for (const match of data.match(/(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{3}=|[A-Za-z\d+/]{2}==)?/gm)) {
    if (match.length < 20) continue;
    try {
      const decoded = atob(match);
      if (/[^\u0010-\u007f]/.test(decoded)) continue;
      stringsToCheck.push(decoded);
    } catch (e) {}
  }
  const flagsFound = [];
  let i = 0;
  for (const stringToCheck of stringsToCheck) {
    for (const flag of flags) {
      if (
        (typeof flag.match == "string" && stringToCheck.includes(flag.match)) ||
        (flag.match instanceof RegExp && flag.match.test(stringToCheck))
      ) {
        if (i == 0) {
          flagsFound.push({ ...flag, file: fileName });
        } else {
          flagsFound.push({ ...flag, file: fileName, segment: stringToCheck });
        }
      }
    }
    i++;
  }
  return flagsFound;
};
