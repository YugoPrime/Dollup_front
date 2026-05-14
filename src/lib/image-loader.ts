type ImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

const PASSTHROUGH_PREFIXES = [
  "https://cdn.dollupboutique.com/",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/",
];

export default function customImageLoader({ src, width, quality }: ImageLoaderProps): string {
  for (const prefix of PASSTHROUGH_PREFIXES) {
    if (src.startsWith(prefix)) return src;
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
