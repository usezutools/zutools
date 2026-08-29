import { base64ToUtf8, utf8ToBase64 } from '@zutools/core/base64';
import { formatJson } from '@zutools/core/json';
import { analyzeText } from '@zutools/core/word-counter';
import './styles.css';

const textInput = document.querySelector('#text-input');
const metricElements = {
  words: document.querySelector('#words'),
  characters: document.querySelector('#characters'),
  sentences: document.querySelector('#sentences'),
  readingTime: document.querySelector('#reading-time'),
};

function updateMetrics() {
  const metrics = analyzeText(textInput.value, { locale: 'en' });
  metricElements.words.textContent = metrics.words.toLocaleString();
  metricElements.characters.textContent = metrics.characters.toLocaleString();
  metricElements.sentences.textContent = metrics.sentences.toLocaleString();
  metricElements.readingTime.textContent = `${metrics.readingTimeSeconds} sec`;
}

textInput.addEventListener('input', updateMetrics);
updateMetrics();

const jsonInput = document.querySelector('#json-input');
const jsonMessage = document.querySelector('#json-message');
document.querySelector('#format-json').addEventListener('click', () => {
  try {
    jsonInput.value = formatJson(jsonInput.value);
    jsonMessage.textContent = 'Valid JSON, formatted locally.';
    jsonMessage.dataset.state = 'success';
  } catch (error) {
    jsonMessage.textContent = error instanceof Error ? error.message : 'Invalid JSON';
    jsonMessage.dataset.state = 'error';
  }
});

const base64Input = document.querySelector('#base64-input');
const base64Message = document.querySelector('#base64-message');

function transformBase64(transform, successMessage) {
  try {
    base64Input.value = transform(base64Input.value);
    base64Message.textContent = successMessage;
    base64Message.dataset.state = 'success';
  } catch (error) {
    base64Message.textContent =
      error instanceof Error ? error.message : 'The value could not be converted.';
    base64Message.dataset.state = 'error';
  }
}

document.querySelector('#encode-base64').addEventListener('click', () => {
  transformBase64(utf8ToBase64, 'Encoded locally.');
});

document.querySelector('#decode-base64').addEventListener('click', () => {
  transformBase64(base64ToUtf8, 'Decoded locally.');
});
