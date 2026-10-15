import { ChangeDetectionStrategy, Component, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { OcrService } from '../../services/ocr';
import { ClipboardModule } from 'ngx-clipboard';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-upload-image',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ClipboardModule],
  templateUrl: './upload-image.html',
  styleUrl: './upload-image.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadImage {
  selectedFile: File | null = null;
  fileName = '';
  fileSizeFormatted = '';
  imageUrl: string | null = null;
  extractedText = '';
  loading = false;
  progress = 0;
  characters = 0;
  words = 0;
  lines = 0;
  isDragging = false;

  @ViewChild('fileInput')
  fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private ocrService: OcrService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    if (!this.isDragging) {
      this.isDragging = true;
      this.cdr.markForCheck();
    }
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.cdr.markForCheck();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.cdr.markForCheck();

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      return;
    }

    this.loadImage(files[0]);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    this.loadImage(input.files[0]);
    // Reset input value so re-selecting the same file will trigger change event
    input.value = '';
  }

  loadImage(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Please select a valid image file (PNG, JPG, WEBP, etc.).', 'Invalid File');
      return;
    }

    this.selectedFile = file;
    this.fileName = file.name;
    this.fileSizeFormatted = this.formatFileSize(file.size);

    const reader = new FileReader();

    reader.onload = () => {
      this.imageUrl = reader.result as string;
      this.cdr.markForCheck();
    };

    reader.onerror = () => {
      this.toastr.error('Failed to read image file.', 'Error');
      this.cdr.markForCheck();
    };

    reader.readAsDataURL(file);
    this.cdr.markForCheck();
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  clearImageOnly(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedFile = null;
    this.imageUrl = null;
    this.fileName = '';
    this.fileSizeFormatted = '';

    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }

    this.cdr.markForCheck();
  }

  clearAll(): void {
    this.clearImageOnly();
    this.extractedText = '';
    this.progress = 0;
    this.loading = false;
    this.characters = 0;
    this.words = 0;
    this.lines = 0;

    this.cdr.markForCheck();
    this.toastr.success('All data cleared.', 'Success');
  }

  downloadText(): void {
    if (!this.extractedText.trim()) {
      this.toastr.warning('No text available to download.', 'Warning');
      return;
    }

    const blob = new Blob([this.extractedText], {
      type: 'text/plain;charset=utf-8'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ExtractedText.txt';
    link.click();
    window.URL.revokeObjectURL(url);
    this.toastr.success('File downloaded successfully.', 'Success');
  }

  async scanImage(): Promise<void> {
    if (!this.selectedFile) {
      this.toastr.warning('Please upload an image first.', 'Warning');
      return;
    }

    this.loading = true;
    this.progress = 0;
    this.cdr.markForCheck();

    try {
      const text = await this.ocrService.extractText(
        this.selectedFile,
        (progress: number) => {
          this.progress = progress;
          this.cdr.markForCheck();
        }
      );

      this.extractedText = text;
      this.calculateStatistics();
      this.cdr.markForCheck();
      this.toastr.success('Text generated successfully.', 'Success');
    } catch {
      this.toastr.error('OCR processing failed.', 'Error');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  calculateStatistics(): void {
    if (!this.extractedText) {
      this.characters = 0;
      this.words = 0;
      this.lines = 0;
      return;
    }

    this.characters = this.extractedText.length;
    this.words = this.extractedText
      .trim()
      .split(/\s+/)
      .filter((word: string) => word.length > 0).length;
    this.lines = this.extractedText
      .split('\n')
      .filter((line: string) => line.trim().length > 0).length;
  }

  onTextChange(): void {
    this.calculateStatistics();
  }

  copySuccess(): void {
    this.toastr.success('Text copied successfully');
  }
}
