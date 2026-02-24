import * as faceapi from 'face-api.js'

let modelsLoaded = false

export async function loadModels() {
  if (modelsLoaded) return

  // Step 1: confirm all 6 files return valid responses
  const files = [
    '/models/tiny_face_detector_model-weights_manifest.json',
    '/models/tiny_face_detector_model.bin',
    '/models/face_landmark_68_model-weights_manifest.json',
    '/models/face_landmark_68_model.bin',
    '/models/face_recognition_model-weights_manifest.json',
    '/models/face_recognition_model.bin',
  ]

  for (const f of files) {
    const res = await fetch(f)
    if (!res.ok) throw new Error(`Cannot fetch: ${f} — got ${res.status}`)
    if (f.endsWith('.json')) {
      const text = await res.text()
      if (text.trim().startsWith('<')) {
        throw new Error(`File "${f}" returned HTML instead of JSON.\nFirst 120 chars:\n${text.slice(0, 120)}`)
      }
    }
  }

  // Step 2: load models one at a time so we know which one fails
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
  } catch (e) {
    throw new Error('tinyFaceDetector failed: ' + e.message)
  }

  try {
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
  } catch (e) {
    throw new Error('faceLandmark68Net failed: ' + e.message)
  }

  try {
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
  } catch (e) {
    throw new Error('faceRecognitionNet failed: ' + e.message)
  }

  modelsLoaded = true
  console.log('✅ face-api models loaded')
}

export async function getEmbeddingFromVideo(videoEl) {
  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
  if (!detection) return null
  return detection.descriptor
}

export function averageEmbeddings(embeddings) {
  if (!embeddings.length) throw new Error('No embeddings to average')
  const len = embeddings[0].length
  const avg = new Array(len).fill(0)
  for (const emb of embeddings) {
    for (let i = 0; i < len; i++) avg[i] += emb[i]
  }
  return avg.map(v => v / embeddings.length)
}

export function matchEmbedding(liveEmbedding, studentRecords, threshold = 0.5) {
  let bestMatch = null
  let bestDistance = Infinity
  for (const student of studentRecords) {
    const stored = new Float32Array(student.embedding)
    const dist = euclideanDistance(liveEmbedding, stored)
    if (dist < bestDistance) { bestDistance = dist; bestMatch = student }
  }
  return bestDistance <= threshold ? { student: bestMatch, distance: bestDistance } : null
}

export async function drawDetections(videoEl, canvasEl) {
  const detections = await faceapi
    .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
  faceapi.matchDimensions(canvasEl, { width: videoEl.videoWidth, height: videoEl.videoHeight })
  const resized = faceapi.resizeResults(detections, { width: videoEl.videoWidth, height: videoEl.videoHeight })
  const ctx = canvasEl.getContext('2d')
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
  faceapi.draw.drawDetections(canvasEl, resized)
  faceapi.draw.drawFaceLandmarks(canvasEl, resized)
  return detections.length
}

function euclideanDistance(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum)
}