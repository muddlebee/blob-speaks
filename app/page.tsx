import { BlobPink } from "@/components/BlobPink";
import { getConvaiPublicConfig } from "@/lib/convai-public-config";

export default function Home() {
  const convai = getConvaiPublicConfig();
  return <BlobPink convai={convai} />;
}
