let mediaRecorder;
let audioChunks = [];

const startButton = document.getElementById('startRecording');
const stopButton = document.getElementById('stopRecording');
const transcriptionDiv = document.getElementById('transcription');
const translationDiv = document.getElementById('translation');

startButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);

async function startRecording() {
  audioChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

  mediaRecorder.addEventListener('dataavailable', event => {
    audioChunks.push(event.data);
  });

  mediaRecorder.start();
  startButton.disabled = true;
  stopButton.disabled = false;
}

async function stopRecording() {
  mediaRecorder.stop();
  startButton.disabled = false;
  stopButton.disabled = true;

  mediaRecorder.addEventListener('stop', async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const result = await getTranscriptionAndTranslation(audioBlob);
    displayResult(result);
  });
}

async function getTranscriptionAndTranslation(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');

  try {
    const response = await fetch('/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error during transcription and translation:', error);
    return { 
      transcription: 'Transcription failed.',
      translation: 'Translation failed.',
      error: error.message
    };
  }
}

function displayResult(result) {
  transcriptionDiv.textContent = `Gujarati: ${result.transcription}`;
  translationDiv.textContent = `English: ${result.translation}`;
  if (result.error) {
    console.error('Error:', result.error);
  }
}
