import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UploadImage } from './components/upload-image/upload-image';

@Component({
  selector: 'app-root',
  imports: [ UploadImage],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('image-text-extractor');
}
