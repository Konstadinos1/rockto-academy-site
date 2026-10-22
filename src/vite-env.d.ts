/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COACH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
