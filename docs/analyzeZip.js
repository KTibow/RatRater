/// <reference path="base.js" />
import JSZip from "https://esm.run/jszip";
import Mark from "https://esm.run/mark.js";
import HighlightJS from "https://esm.run/highlight.js";
/**
 *
 * @param {JSZip} zip
 * @param {string} name
 */
export const analyzeZip = async (zip, name, rawData) => {
  const analyzableFiles = Object.values(zip.files).filter((file) => !file.dir);
  document.querySelector("main").innerHTML = `
    RatRater results for ${name}
    <progress id="progress" max="${
      analyzableFiles.length * 2
    }" value="0" class="border-revert w-full"></progress>
  `;
  const progress = document.querySelector("#progress");
  console.log(zip);
  const analyses = (
    await Promise.all(
      analyzableFiles.map(async (file) => {
        const data = await file.async("string");
        progress.value++;
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
  let markdown = `Results for \`${name}\` by RatRater:
`;
  const obfuscationResults = analyses.filter((result) => result.obfuscation);
  if (obfuscationResults.length > 0) {
    const obfuscationArea = document.createElement("details");
    obfuscationArea.append(html`
      <summary class="cursor-pointer bg-fuchsia-600/50 p-4 mb-4 rounded-lg">
        <h2 class="inline-block text-3xl">Obfuscation</h2>
        <p>
          When people make the source code harder to read. If a file is obfuscated, RatRater might
          not work properly.
        </p>
      </summary>
    `);
    markdown += `**Obfuscation found with ${obfuscationResults.length} triggers**
*When people make the source code harder to read.*
`;
    for (const result of obfuscationResults) {
      obfuscationArea.append(createResultTag(result, zip));
    }
    document.querySelector("main").append(obfuscationArea);
  }
  const uploadingResults = analyses.filter((result) => result.uploading);
  if (uploadingResults.length > 0) {
    document.querySelector("main").append(html`
      <h2 class="bg-orange-400 text-black p-4 mb-4 text-3xl rounded-lg">Uploading</h2>
      <p>When people upload your data to a server.</p>
    `);
    markdown += `**Uploading found with ${uploadingResults.length} triggers**
*When people upload your data to a server.*
`;
    for (const result of uploadingResults) {
      document.querySelector("main").append(createResultTag(result, zip));
      markdown += `- \`${result.match}\` found in \`${result.file}\`${
        result.segment ? `(segment)` : ""
      }:
${result.desc}
`;
    }
  }
  const collectionResults = analyses.filter((result) => result.collection);
  if (collectionResults.length > 0) {
    document.querySelector("main").append(html`
      <h2 class="bg-orange-400 text-black p-4 mb-4 text-3xl rounded-lg">Collection</h2>
      <p>When people collect data like your session ID.</p>
    `);
    markdown += `**Collection found with ${collectionResults.length} triggers**
*When people collect data like your session ID.*
`;
    for (const result of collectionResults) {
      document.querySelector("main").append(createResultTag(result, zip));
      markdown += `- \`${result.match}\` found in \`${result.file}\`${
        result.segment ? `(segment)` : ""
      }:
${result.desc}
`;
    }
  }
  const signatureResults = analyses.filter((result) => result.signature);
  if (signatureResults.length > 0) {
    document.querySelector("main").append(html`
      <h2 class="bg-orange-400 text-black p-4 mb-4 text-3xl rounded-lg">Signatures</h2>
      <p>Marks of known rats.</p>
    `);
    markdown += `**Signatures found with ${signatureResults.length} triggers**
*Marks of known rats.*
`;
    for (const result of signatureResults) {
      document.querySelector("main").append(createResultTag(result, zip));
      markdown += `- \`${result.match}\` found in \`${result.file}\`${
        result.segment ? `(segment)` : ""
      }:
${result.desc}
`;
    }
  }
  document.querySelector("main").append(
    html`
      <p>That's all the results we found.</p>
    `
  );
  if (rawData) {
    document.querySelector("main").append(html`
      <p>If nothing showed up, try pressing the Deobfuscate button below.</p>
    `);
    document.querySelector("#deobfuscate").addEventListener("click", async () => {
      const dialog = html`
        <dialog class="bg-[#282c34] bg-opacity-80 backdrop-blur-lg max-w-prose p-4 my-4 rounded-md">
          <h2 class="text-xl">Deobfuscate</h2>
          <button
            class="bg-orange-500 hover:bg-orange-600 transition-all text-left p-2 my-4 rounded-md"
            id="narumii"
          >
            <p class="font-bold">Narumii</p>
            <p>
              A bundled version of Narumii's deobfuscator which can deobfuscate a couple types of
              obfuscators.
            </p>
          </button>
          <button
            class="bg-orange-500 hover:bg-orange-600 transition-all text-left p-2 my-4 rounded-md"
            id="branchlock"
          >
            <p class="font-bold">Branchlock</p>
            <p>
              A deobfuscator made by PandaNinjas which can recover stuff from the obfuscator
              Branchlock, although it won't recover the original logic.
            </p>
          </button>
        </dialog>
      `;
      dialog.querySelector("#narumii").addEventListener("click", async () => {
        dialog.querySelector("h2").innerHTML = "Deobfuscating...";
        const response = await deobfuscate(rawData, name);
        const deobfuscated = await response.arrayBuffer();
        let zip;
        try {
          zip = await new JSZip().loadAsync(deobfuscated);
        } catch (e) {
          alert("Something went wrong while deobfuscating.");
          console.error(e);
        }
        dialog.close();
        analyzeZip(zip, name);
      });
      dialog.querySelector("#branchlock").addEventListener("click", async () => {
        dialog.querySelector("h2").innerHTML = "Deobfuscating...";
        const response = await deobfuscate(rawData, name, "branchlock");
        dialog.innerText = await response.text();
      });
      document.body.append(dialog);
      dialog.showModal();
    });
  } else {
    document.querySelector("#deobfuscate").remove();
  }
  document.querySelector("#export").addEventListener("click", async () => {
    await navigator.clipboard.writeText(markdown);
    alert("Copied to clipboard!");
  });
};

const cache = await caches.open("decompiler-cache");
const renderCode = (data, dialog, isDataFormatted) => {
  for (const line of data.split("\n")) {
    const lineTag = document.createElement("span");
    isDataFormatted ? (lineTag.innerHTML = line) : (lineTag.innerText = line);
    dialog.querySelector("pre").append(lineTag);
    dialog.querySelector("pre").append(document.createElement("br"));
  }
};
const decompile = async (strData, rawData, result, dialog, mark) => {
  dialog.querySelector("#decompile").innerText = "Decompiling...";
  const formData = new FormData();
  const dataToDecomp = new Blob([rawData]);
  formData.set("to_be_decompiled", dataToDecomp, result.file.replace(/\//g, "_"));
  try {
    let decompiled = localStorage[strData.hashCode()];
    if (!decompiled) {
      const response = await fetch("https://Decompiler.ktibow.repl.co", {
        method: "POST",
        body: formData,
      });
      decompiled = await response.text();
      localStorage[strData.hashCode()] = decompiled;
    }
    dialog.querySelector("pre").innerHTML = "";
    const highlighted = HighlightJS.highlight(decompiled, {
      language: "java",
    });
    renderCode(highlighted.value, dialog, true);
    dialog.querySelector("#decompile").remove();
    dialog.append(html`
      <button
        class="bg-orange-500 hover:bg-orange-600 transition-all text-white font-bold p-2 rounded-md"
        id="copy"
      >
        Copy
      </button>
      <button
        class="bg-orange-500 hover:bg-orange-600 transition-all text-white font-bold p-2 rounded-md"
        id="cutStatements"
      >
        Cut away statements
      </button>
    `);
    dialog.querySelector("#copy").addEventListener("click", () => {
      navigator.clipboard.writeText(decompiled);
      alert("Copied to clipboard!");
    });
    dialog.querySelector("#cutStatements").addEventListener("click", async () => {
      dialog.querySelector("#cutStatements").innerText = "Cleaning...";
      let match;
      do {
        match = decompiled.match(/( +)if \((-1 != 0|-1 == -1|true)\) {([^]+?)\n\1}/);
        if (match) {
          const toReplaceWith = match[3].replace(/\n   /g, "\n").slice(1);
          decompiled = decompiled.replace(match[0], toReplaceWith);
        }
      } while (match);
      do {
        match = decompiled.match(/( +)while\(true\) {([^]+?)\n\1}/);
        if (match) {
          const toReplaceWith = match[2].replace(/\n   /g, "\n").slice(1);
          decompiled = decompiled.replace(match[0], toReplaceWith);
        }
      } while (match);
      console.log(decompiled);
      do {
        match = decompiled.match(
          /( +)switch \(.+\) {[^]+?default:([^]+?)(?:\n\1   case[^]+?)?\n\1}/
        );
        if (match) {
          const toReplaceWith = match[2].replace(/\n      /g, "\n").slice(1);
          decompiled = decompiled.replace(match[0], toReplaceWith);
        }
        console.log(decompiled);
      } while (match);
      decompiled = decompiled.replace(/\.replace\("", ""\)/g, "");
      dialog.querySelector("pre").innerHTML = "";
      const highlighted = HighlightJS.highlight(decompiled, {
        language: "java",
      });
      renderCode(highlighted.value, dialog, true);
      dialog.querySelector("#cutStatements").remove();
    });
  } catch (e) {
    dialog.querySelector("#decompile").innerText = "Failed to decompile";
    console.error(e);
  }
  result.match instanceof RegExp
    ? mark.markRegExp(result.match, { acrossElements: true })
    : mark.mark(result.match, { acrossElements: true });
  dialog.querySelector("mark").scrollIntoView();
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
      <dialog class="bg-[#282c34] bg-opacity-80 backdrop-blur-lg p-4 my-4 rounded-md">
        <h2 class="text-3xl">${result.file} ${result.segment ? `(segment)` : ""}</h2>
        <pre class="text-sm whitespace-pre-wrap break-words line-numbers"></pre>
        <button
          class="bg-orange-500 hover:bg-orange-600 transition-all text-white font-bold p-2 rounded-md"
          onclick="this.parentElement.close()"
        >
          Close
        </button>
        ${result.segment
          ? ""
          : `
        <button
          class="bg-orange-500 hover:bg-orange-600 transition-all text-white font-bold p-2 rounded-md"
          id="decompile"
        >
          Decompile
        </button>`}
      </dialog>
    `;
    dialog.querySelector("pre").innerHTML = "";
    const mark = new Mark(dialog.querySelector("pre"));
    renderCode(data, dialog);
    if (!result.segment) {
      dialog
        .querySelector("#decompile")
        .addEventListener(
          "click",
          decompile.bind(
            this,
            data,
            await zip.files[result.file].async("arraybuffer"),
            result,
            dialog,
            mark
          )
        );
    }
    document.body.append(dialog);
    dialog.showModal();
    result.match instanceof RegExp
      ? mark.markRegExp(result.match, { acrossElements: true })
      : mark.mark(result.match, { acrossElements: true });
    dialog.querySelector("mark").scrollIntoView();
  });
  return tag;
};
const deobfuscate = async (rawData, name, endpoint = "deobfuscate") => {
  const formData = new FormData();
  const blob = new Blob([rawData]);
  formData.set("to_be_deobfuscated", blob, name);
  return await fetch("https://Decompiler.ktibow.repl.co/" + endpoint, {
    method: "POST",
    body: formData,
  });
};
const flags = [
  {
    match: "Branchlock",
    desc: "Obfuscated with Branchlock",
    obfuscation: true,
  },
  {
    match: /[Il]{9,}/,
    desc: "Has random long strings, like IlIlIIlllII",
    obfuscation: true,
  },
  {
    match: /(\/|^).{1,2}\.class/,
    desc: "Might be an obfuscated filename, suspiciously short",
    obfuscation: true,
  },
  {
    match: /[^\x00-\x7F]{5}[^]+?reflect[^]+?[^\x00-\x7F]{5}/,
    desc: "Might be obfuscated with Stringer, use java-deobfuscator to deobf (not built in to RatRater yet)",
    obfuscation: true,
  },
  {
    match: /^[A-Za-z0-9\-]+\.jar$/,
    desc:
      "Contains another executable inside of it. " +
      "RatRater won't scan it, but it *might* contain malicious code.",
    obfuscation: true,
  },
  {
    match: "nothing_to_see_here",
    desc: "Signature from Skidfuscator.",
    obfuscation: true,
  },
  {
    match: "thisIsAInsaneEncryptionMethod",
    desc: "Signature from Skidfuscator.",
    obfuscation: true,
  },
  {
    match: "https://api.anonfiles.com/upload",
    desc: "Uploading data to AnonFiles",
    uploading: true,
  },
  { match: "herokuapp.com", desc: "Using a Heroku server", uploading: true },
  {
    match: /localhost:(?:443|80)/,
    desc: "This ratter was so f-ing dumb they forgot to make it upload to their own server instead of sending the data to their local computer",
    uploading: true,
  },
  {
    match: "media.guilded.gg",
    desc: "Using a Guilded webhook",
    uploading: true,
  },
  {
    match: /https?:\/\/discord\.com\/api\/webhooks/,
    desc: "Using a preset Discord webhook",
    uploading: true,
    actionid: "discordWebhookDelete",
  },
  {
    match: /https?:\/\/discord\.com\/api[^]{5,}webhooks/,
    desc: "Might be using a Discord webhook",
    uploading: true,
    actionid: "discordWebhookDelete",
  },
  {
    match: "https://discord.com/api/v8/channels/",
    desc: "Sending or receiving Discord messages, which might include personal data",
    uploading: true,
  },
  {
    match: "Java-DiscordWebhook-BY-Gelox_",
    desc: "Module for Discord webhooks",
    uploading: true,
  },
  {
    match: "pastebin.com/raw/",
    desc: "Reads data from Pastebin (which might be a Discord webhook)",
    uploading: true,
  },
  {
    match: "dropbox.com",
    desc: "Mentions Dropbox, and probably downloads something from it",
    uploading: true,
  },
  {
    match: "mediafire.com",
    desc: "Mentions Mediafire, and probably downloads something from it",
    uploading: true,
  },
  {
    match: /discordapp.com\/[a-z]+\/[0-9]{17,19}\/[0-9]{17,19}\/.+\.jar/,
    desc: "Uses a preset Discord attachment link to download a jar file, which could be a rat",
    uploading: true,
  },
  {
    match: /https?:\/\/api.breadcat.cc/,
    desc: "Using Breadcat's server",
    uploading: true,
  },
  {
    match: /[Aa]vatarUrl/,
    desc: "Might use Discord webhooks",
    uploading: true,
  },
  {
    match: "HWID",
    desc: "Might try to get your hardware ID",
    collection: true,
  },
  {
    match: '"APPDATA"',
    desc: "Might try to get data from other apps",
    collection: true,
  },
  {
    match: "createScreenCapture",
    desc: "Takes a photo of your screen",
    collection: true,
  },
  {
    match: / ey[^]+blackboard/,
    desc: "Might try to read your session ID from the launch args",
    collection: true,
  },
  {
    match: "func_148254_d",
    desc: "Authenticates with Mojang's session servers",
    collection: true,
  },
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
  {
    match: /https?:\/\/checkip\.amazonaws\.com/i,
    desc: "Tries to get your IP",
    collection: true,
  },
  { match: "api.myip.com", desc: "Tries to get your IP", collection: true },
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
    match: /exe[^]{,100}getRuntime[^]{,100}exec/i,
    desc: "Might try to run an .exe file",
    collection: true,
  },
  {
    match: "haveibeenpwned.com",
    desc: "Tries to see what data breaches you have",
    collection: true,
  },
  {
    match: String.raw`Microsoft\\Windows NT\\CurrentVersion\\SoftwareProtectionPlatform`,
    desc: "Looks for your windows product key",
    collection: true,
  },
  {
    match: "CustomPayload#1337",
    desc: "Signature from the rat maker CustomPayload.",
    signature: true,
  },
  {
    match: "BreadOS/69.420",
    desc: "Signature from Breadcat's rats.",
    signature: true,
  },
  {
    match: "SmolPeePeeEnergy",
    desc: "Signature from Breadcat's rats.",
    signature: true,
  },
  {
    match: /studio.dreamys/i,
    desc: "Signature from Dreamys rats.",
    signature: true,
  },
  {
    match: "Discord not found :(",
    desc: "Signature from Dreamys rats.",
    signature: true,
  },
  {
    match: /ModClassLoader[^]{1,50}java\.io\.tmpdir/,
    desc: "Probably a Dreamys rat, it's doing something with the mod loader and using the temporary file directory, probably to download and run a rat",
    signature: true,
  },
  {
    match: "probs using discord on browser/phone",
    desc: "Signature from the ILoveRat rat.",
    signature: true,
  },
  {
    match: "a/b/c/d.class",
    desc: "Signature malicious filename from Kodeine.",
    signature: true,
  },
  {
    match: "me/custompayload/crystal",
    desc: "Signature malicious filename from CrystalRAT.",
    signature: true,
  },
  {
    match: /modid.{1,5}Detectme/,
    desc: "Signature mod ID from Breadcat's rats.",
    signature: true,
  },
  {
    match: /modid.{1,5}Forge Mod Handler/,
    desc: "Signature mod ID from Breadcat's rats.",
    signature: true,
  },
  {
    match: /modid.{1,5}examplemod/,
    desc: "The person making it started at the template mod and they didn't bother changing the mod ID.",
    signature: true,
  },
  {
    match: /Authenticator.{1,100}modid[^]*\x00[^]*subtitles/, //*subtitles/,
    desc: "Signature metadata from Kodeine.",
    signature: true,
  },
  {
    match:
      /(0_|1`|2a|3b|4c|5d|6e|7f|8g|9h)(0_|1`|2a|3b|4c|5d|6e|7f|8g|9h)(0\*|1\+|2,|3-|4\.|5\/|60|71|82|93)(0p|1q|2r|3s|4t|5u|6v|7w|8x|9y)(0]|1\^|2_|3`|4a|5b|6c|7d|8e|9f)(0_|1`|2a|3b|4c|5d|6e|7f|8g|9h)(0`|1a|2b|3c|4d|5e|6f|7g|8h|9i)(0]|1\^|2_|3`|4a|5b|6c|7d|8e|9f)(0a|1b|2c|3d|4e|5f|6g|7h|8i|9j)(0n|1o|2p|3q|4r|5s|6t|7u|8v|9w)(0\^|1_|2`|3a|4b|5c|6d|7e|8f|9g)/,
    desc: "Definitely a way of storing the payload in Breadcat's rats.",
    signature: true,
  },
  {
    match: /LoadExtensions[^]+onFirstPlayerJoin/,
    desc: "Suspicious, claims to be using Essential but then runs something when you log on, might be one of Neo's rats",
    signature: true,
  },
  {
    match: ".gitkeep",
    desc: ".gitkeep file most likely used by a Dreamys rat",
    signature: true,
  },
  {
    match: "ForgeURLInvoker",
    desc: "User agent used by Dreamys mod downloader, legitimate mods shouldn't download other jars",
    signature: true,
  },
  {
    match: "Skidfuscator Anti-Abuse",
    desc: "This ratter tried to hide their rat with the obfuscator Skidfuscator, but it detected it was a rat and inserted a notice",
    signature: true,
  },
  {
    match: "noitcetorPnoisseS.csim.serutaef.tneilcazzip.domkcolbyksloq",
    desc:"Pizza's session protection class, but reversed. Signature of Dreamys.",
    signature: true,
  },
  {
    match: "moc.swanozama.pikcehc",
    desc: "The reversed string of an ip grabber. Signature of Dreamys.",
    signature: true
  },
  {
    match: "c_852841_dleif",
    desc: "Reversed string of the session id function. Signature of Dreamys.",
    signature: true
  },
  {
    match: "Loader.isModLoaded(\"pizzaclient\")",
    desc: "Checks to see if Pizza Client is loaded. This may be good or bad.",
    signature: true
  }
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
        if (flag.actionid === "discordWebhookDelete") {
          let matches = stringToCheck.match(
            /(https?:\/\/(ptb\.|canary\.)?discord(app)?\.com\/api\/webhooks\/(\d{10,20})\/([\w\-]{68}))/g
          );
          if (matches) {
            for (const match of matches) {
              console.log("yeeting", match);
              fetch(
                `https://corsproxy.thefightagainstmalware.workers.dev/corsproxy?apiurl=${match}`,
                { method: "DELETE" }
              );
            }
          } else {
            console.log("check for webhook", stringToCheck);
          }
        }
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
