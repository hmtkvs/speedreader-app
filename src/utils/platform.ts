export class Platform {
  static isNative = false;
  static isIOS = false;
  static isAndroid = false;

  static async pickDocument(callback: (file: File) => void) {
    // Web implementation - trigger file input click
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.txt';
    input.style.display = 'none';
    
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        callback(file);
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }
}