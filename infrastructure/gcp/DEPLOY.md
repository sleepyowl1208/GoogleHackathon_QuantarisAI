# Deploy QuantarisAI to Google Cloud Run

One container serves the website and the API (see `Dockerfile`). You need a Google Cloud project with billing on, and the `gcloud` CLI signed in (`gcloud auth login`).

## 1. One-time setup
```sh
export PROJECT_ID=your-project-id
export REGION=asia-south1            # Mumbai
gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

## 2. Store the Gemini key as a secret (never in the image or the repo)
```sh
# type the key when prompted, or pipe it from a file; it is not echoed and not kept in shell history
read -rs GEMINI_KEY && printf %s "$GEMINI_KEY" | gcloud secrets create gemini-api-key --data-file=- ; unset GEMINI_KEY
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role=roles/secretmanager.secretAccessor
```
To change the key later: `printf %s "$NEW" | gcloud secrets versions add gemini-api-key --data-file=-`, then redeploy.

## 3. Deploy (builds the image with Cloud Build, then runs it)
From the project root:
```sh
gcloud run deploy quantaris --source . --region $REGION \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest \
  --memory 1Gi --cpu 1 --timeout 300 --concurrency 40 \
  --min-instances 1 --max-instances 3 \
  --allow-unauthenticated
```
It prints the service URL. First build takes about 5 to 8 minutes.

Optional settings: `--set-env-vars GEMINI_MODEL=...` to pick a model; a Google Maps server key can be added the same way as a secret named `GOOGLE_MAPS_SERVER_KEY`.

## 4. Check it
```sh
URL=$(gcloud run services describe quantaris --region $REGION --format='value(status.url)')
curl $URL/api/health          # {"status":"ok"}
```
Then open `$URL` in a browser.

## Things to know
- **Anyone with the URL can use it, and every design costs Gemini calls.** There are per-hour limits inside the app, but they are per instance and reset on restart. For a public demo keep `--max-instances` low and watch billing. To keep it private, drop `--allow-unauthenticated` and use `gcloud run services proxy quantaris --region $REGION` to open it locally.
- **Nothing is saved on the server.** Chats live in each user's browser. The small cache (map lookups, generated clips) is lost when an instance stops, so a generated video can be missing after a restart.
- **Video generation (Veo)** runs in the background and needs CPU while it waits. If you use it, add `--no-cpu-throttling`.
- **Cold starts:** `--min-instances 1` keeps one instance warm (small monthly cost). Use `0` to pay nothing when idle.
- Google login, Firestore, BigQuery and the other planned services are not part of this deployment yet.

## Run the same image on your machine first
```sh
docker build -t quantaris .
docker run --rm -p 8080:8080 --env-file .env.local quantaris     # open http://localhost:8080
```
