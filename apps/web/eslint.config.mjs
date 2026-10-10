import nextVitals from "eslint-config-next/core-web-vitals";
// public/mediapipe holds MediaPipe's own compiled runtime (hand tracking), which is not our code.
const config = [...nextVitals, { ignores: ["public/mediapipe/**"] }];
export default config;
