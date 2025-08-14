import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat {
  chatHistory: { role: 'user' | 'assistant', text?: string, image?: string }[] = [];
  userInput = '';
  // responseText = '';
  selectedImage?: File;
  selectedFile?: File;
  imagePreviewUrl: string | null = null;
  imageQuestion: string = '';
  imageFileName: string = '';

  constructor(private ngZone: NgZone, private http: HttpClient) { }

  // async sendMessage() {
  //   this.responseText = '';

  //   const response = await fetch('http://localhost:8080/chat/stream', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ question: this.userInput, image: this.imageFileName }),
  //   });

  //   const reader = response.body?.getReader();
  //   const decoder = new TextDecoder();

  //   if (!reader) {
  //     console.error('No reader available');
  //     return;
  //   }
  //   let buffer = '';
  //   while (true) {
  //     const { value, done } = await reader.read();
  //     if (done) break;

  //     const chunk = decoder.decode(value, { stream: true });

  //     this.ngZone.run(() => {
  //       this.responseText += chunk; // No need to clean `data:` anymore!
  //     });
  //   }
  // }
  async sendMessage() {
  if (!this.userInput.trim()) return;

  const userMessage = this.userInput;
  this.chatHistory.push({ role: 'user', text: userMessage });

  // Add placeholder assistant message to stream into
  const assistantMessageIndex = this.chatHistory.push({ role: 'assistant', text: '' }) - 1;

  try {
    const response = await fetch('http://localhost:8080/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: userMessage })
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error('No reader available');

    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;

      this.ngZone.run(() => {
        this.chatHistory[assistantMessageIndex].text = fullText;
      });
    }

  } catch (err) {
    console.error('Streaming failed:', err);
    this.chatHistory.push({ role: 'assistant', text: '⚠️ Failed to fetch response from server.' });
  }

  this.userInput = '';
}


//   async sendImageMessage(imageFilename?: string) {
//   this.responseText = '';

//   const requestPayload: any = {
//     question: this.userInput
//   };

//   if (imageFilename) {
//     requestPayload.image = imageFilename;
//   }

//   try {
//     const response = await fetch('http://localhost:8080/images/question', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(requestPayload)
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }

//     const responseArray: string[] = await response.json();

//     // Join the string array for display
//     this.ngZone.run(() => {
//       this.responseText = responseArray.join('\n\n'); // or use bullet points or HTML formatting
//     });
//   } catch (error) {
//     console.error('Error during fetch:', error);
//     this.responseText = 'Failed to fetch response from server.';
//   }
// }
async sendImageMessage(imageFilename?: string) {
  const requestPayload: any = {
    question: this.userInput || this.imageQuestion
  };
  if (imageFilename) {
    requestPayload.image = imageFilename;
  }

  try {
    const response = await fetch('http://localhost:8080/images/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseArray: string[] = await response.json();
    const finalResponse = responseArray.join('\n\n');

    this.ngZone.run(() => {
      this.chatHistory.push({ role: 'assistant', text: finalResponse });
    });

  } catch (error) {
    console.error('Error during fetch:', error);
    this.chatHistory.push({ role: 'assistant', text: '⚠️ Failed to fetch response from server.' });
  }
}


  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedImage = input.files[0];

      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedImage);
    }
  }

//   uploadImageWithQuestion() {
//   if (!this.selectedImage) return;

//   const formData = new FormData();
//   formData.append('file', this.selectedImage);
//   // formData.append('question', this.imageQuestion);

//   this.http.post('http://localhost:8080/upload', formData, { responseType: 'text' }).subscribe({
//     next: (res) => {
//       console.log('Upload & question sent successfully', res);
//       this.userInput = this.imageQuestion;
//       this.imageFileName = res;
//       this.selectedImage = undefined;
//       this.imagePreviewUrl = null;
//       this.imageQuestion = '';
//       this.sendImageMessage(res);      
      
//     },
//     error: (err) => {
//       console.error('Upload failed', err);
//       alert('Image upload failed');
//     }
//   });
// }
uploadImageWithQuestion() {
  if (!this.selectedImage) return;

  const formData = new FormData();
  formData.append('file', this.selectedImage);

  // Show user message with image + question
  const imagePreview = this.imagePreviewUrl;
  const question = this.imageQuestion;

  this.chatHistory.push({
    role: 'user',
    text: question,
    image: imagePreview || undefined
  });

  this.http.post('http://localhost:8080/upload', formData, { responseType: 'text' }).subscribe({
    next: (res) => {
      this.imageFileName = res;
      this.selectedImage = undefined;
      this.imagePreviewUrl = null;
      this.imageQuestion = '';
      this.sendImageMessage(res);
    },
    error: (err) => {
      console.error('Upload failed', err);
      this.chatHistory.push({ role: 'assistant', text: '⚠️ Image upload failed' });
    }
  });
}


  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
    }
  }
  closeImagePreview() {
    this.imagePreviewUrl = null;
    this.selectedImage = undefined;
  }
}
