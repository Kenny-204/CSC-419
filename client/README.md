# Face Recognition Attendance System — Frontend

React + face-api.js frontend for the attendance system.

---

## 1. Install dependencies

```bash
cd client
npm install
```

---

## 2. Download face-api.js models  ⚠️ Required

The AI models are NOT included in this repo (they're ~6MB).
Download them and place them in the `public/models/` folder.

**Direct download:**
https://github.com/vladmandic/face-api/tree/master/model

You need these files (download all .json + .bin pairs):

```
public/
  models/
    tiny_face_detector_model-weights_manifest.json
    tiny_face_detector_model-shard1
    face_landmark_68_model-weights_manifest.json
    face_landmark_68_model-shard1
    face_recognition_model-weights_manifest.json
    face_recognition_model-shard1
    face_recognition_model-shard2
```

**Quick download with curl:**
```bash
mkdir -p public/models
cd public/models

BASE="https://raw.githubusercontent.com/vladmandic/face-api/master/model"

curl -O $BASE/tiny_face_detector_model-weights_manifest.json
curl -O $BASE/tiny_face_detector_model-shard1
curl -O $BASE/face_landmark_68_model-weights_manifest.json
curl -O $BASE/face_landmark_68_model-shard1
curl -O $BASE/face_recognition_model-weights_manifest.json
curl -O $BASE/face_recognition_model-shard1
curl -O $BASE/face_recognition_model-shard2
```

---

## 3. Start the dev server

```bash
npm run dev
```

App runs at: http://localhost:3000

> The backend (Node.js API) should be running at port 5000.
> All `/api/*` calls are proxied there via vite.config.js.

---

## Project structure

```
src/
  pages/
    Dashboard.jsx     # Stats overview + recent records
    Register.jsx      # Capture student face + save to DB
    Attendance.jsx    # Live scan + mark present
    Students.jsx      # View/delete registered students
  utils/
    faceApi.js        # All face-api.js logic (models, embedding, matching)
  App.jsx             # Routes + sidebar layout
  index.css           # Global styles
```

---

## How face recognition works (simplified)

```
Register:
  Camera → face detected → 5 samples captured →
  averaged into 1 embedding (128 numbers) → saved to DB

Attendance:
  Camera → face detected → embedding generated →
  compared against all stored embeddings →
  if Euclidean distance < 0.5 → MATCH → mark PRESENT
```

---

## Threshold tuning

In `src/utils/faceApi.js`, the `matchEmbedding()` function uses a
threshold of `0.5` by default.

- **Lower (e.g. 0.4)** → stricter, fewer false positives
- **Higher (e.g. 0.6)** → more lenient, better in bad lighting

Adjust based on your testing.
