import { useState } from "react";
import type { FormEvent } from "react";
import { Intro, PanelTitle, Status, Empty } from "../components/AdminUiAtoms";
import type { RequestFn } from "../types";

const localObjectBucket =
  import.meta.env.VITE_S3_BUCKET ?? "fieldbrix-local-uploads";

async function sha256Base64(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  let binary = "";
  for (const byte of new Uint8Array(digest))
    binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function FilesView({
  request,
  notify,
}: {
  request: RequestFn;
  notify: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const checksum = await sha256Base64(file);
      const intent = await request("/files/upload-intents", {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ mime: file.type, size: file.size, checksum }),
      });
      const signedUrl = String(intent.url).replace(
        /^https?:\/\/[^/]+\.localstack:4566/,
        `http://localhost:4566/${localObjectBucket}`,
      );
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: intent.headers,
        body: file,
      });
      if (!uploadResponse.ok)
        throw new Error("The object store rejected the upload");
      await request(`/files/${intent.uploadId}/complete`, {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ checksum }),
      });
      setUploaded((current) => [file.name, ...current]);
      setFile(null);
      notify("File uploaded and verified");
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to upload file",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <Intro
        eyebrow="EVIDENCE STORAGE"
        title="Files & evidence"
        text="Upload approved images and PDFs through a checksum-verified, tenant-scoped object-store flow."
      >
        <form className="inline-form" onSubmit={upload}>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <button className="primary-button" disabled={!file || busy}>
            {busy ? "Uploading…" : "Upload file"}
          </button>
        </form>
      </Intro>
      <section className="panel">
        <PanelTitle title="Recent uploads" />
        {uploaded.map((name) => (
          <div className="directory-row" key={name}>
            <span className="company-logo">↥</span>
            <span>
              <b>{name}</b>
              <small>Checksum verified · object stored</small>
            </span>
            <Status value="COMPLETED" />
          </div>
        ))}
        {!uploaded.length && (
          <Empty text="Uploaded evidence will appear here during this session." />
        )}
      </section>
    </div>
  );
}
