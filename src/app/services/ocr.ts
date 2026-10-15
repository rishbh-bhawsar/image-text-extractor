import { Injectable } from '@angular/core';
import { createWorker } from 'tesseract.js';

@Injectable({
  providedIn: 'root'
})
export class OcrService {

    async extractText(
    file: File,
    progressCallback: (progress: number) => void
  ): Promise<string> {

    const worker = await createWorker('eng', 1, {
      logger: message => {

        if (
          message.status === 'recognizing text'
          && message.progress
        ) {

          progressCallback(
            Math.floor(message.progress * 100)
          );

        }

      }
    });

    const result = await worker.recognize(file);

    await worker.terminate();

    return result.data.text;

  }
}
