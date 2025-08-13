// utils/pdfHandler.ts
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
import { Asset } from "expo-asset";

type CreateParams = {
  html: string;
  name: string; // employee name used for filename
  share?: boolean;
  email?: boolean;
  emailTo?: string;
};

async function assetToBase64(moduleRef: any) {
  // moduleRef like: require('../assets/logo.png')
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  // determine mime from extension
  const ext = uri.split(".").pop()?.toLowerCase() || "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${base64}`;
}

export async function createAndSharePdf(params: CreateParams) {
  const { html: rawHtml, name, share = true, email = false, emailTo } = params;

  // load assets and convert
  const logoBase64 = await assetToBase64(require("../assets/logo.png"));
  let watermarkBase64 = "";
  try {
    watermarkBase64 = await assetToBase64(require("../assets/watermark.png"));
  } catch (e) {
    // watermark optional
  }

  // replace placeholders in HTML (file:///assets/...)
  let html = rawHtml
    .replace(/src="file:\/\/\/assets\/logo.png"/g, `src="${logoBase64}"`)
    .replace(/src='file:\/\/\/assets\/logo.png'/g, `src='${logoBase64}'`);

  if (watermarkBase64) {
    html = html
      .replace(/src="file:\/\/\/assets\/watermark.png"/g, `src="${watermarkBase64}"`)
      .replace(/src='file:\/\/\/assets\/watermark.png'/g, `src='${watermarkBase64}'`);
  }

  // generate pdf (temporary)
  const { uri: tmpUri } = await Print.printToFileAsync({ html });

  // create safe filename
  const safe = (name || "employee").replace(/\s+/g, "_").replace(/[^\w-_]/g, "");
  const filename = `${safe}_payslip.pdf`;
  const dest = FileSystem.documentDirectory + filename;

  // remove existing
  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) await FileSystem.deleteAsync(dest);
  } catch {}

  // move temp -> dest
  await FileSystem.moveAsync({ from: tmpUri, to: dest });

  // share if requested
  if (share) {
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(dest);
    }
  }

  // email if requested
  if (email) {
    const mailAvailable = await MailComposer.isAvailableAsync();
    if (mailAvailable) {
      await MailComposer.composeAsync({
        recipients: emailTo ? [emailTo] : [],
        subject: `Payslip - ${name}`,
        body: "Please find attached payslip.",
        attachments: [dest],
      });
    }
  }

  return dest;
}
