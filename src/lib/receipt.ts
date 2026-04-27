import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
export async function printHtmlDocument(html: string): Promise<void> {
  await Print.printAsync({
    html,
  });
}

export async function shareHtmlDocumentPdf(html: string): Promise<boolean> {
  const available = await Sharing.isAvailableAsync();

  if (!available) {
    return false;
  }

  const file = await Print.printToFileAsync({
    html,
  });

  await Sharing.shareAsync(file.uri, {
    UTI: '.pdf',
    mimeType: 'application/pdf',
  });

  return true;
}
