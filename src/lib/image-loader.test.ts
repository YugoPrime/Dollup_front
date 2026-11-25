// Covers the custom next/image loader. Run with `npx tsx src/lib/image-loader.test.ts`.
import loader from "./image-loader"

let ok = true
function check(label: string, got: unknown, exp: unknown): void {
  const pass = JSON.stringify(got) === JSON.stringify(exp)
  if (!pass) { ok = false; console.error("FAIL", { label, got, exp }) }
}

const CDN = "https://cdn.dollupboutique.com/"
const resized = (w: number, q = 75) =>
  `${CDN}cdn-cgi/image/width=${w},quality=${q},fit=scale-down,format=auto,onerror=redirect/`

// Product photos on the R2 CDN go through Cloudflare Image Transformations, snapped to 4 widths so
// one photo costs at most 4 unique transformations a month.
const root = "IS2454-Black-r-01M8AA4DM7SV0XW6NJBM3KK4DD.jpg"
check("thumb rail 90px", loader({ src: CDN + root, width: 96 }), resized(400) + root)
check("150px rail at DPR3 stays 400", loader({ src: CDN + root, width: 450 }), resized(400) + root)
check("card", loader({ src: CDN + root, width: 640 }), resized(800) + root)
check("pdp hero 100vw phone", loader({ src: CDN + root, width: 1170 }), resized(1200) + root)
check("large screens cap at 1600", loader({ src: CDN + root, width: 3840 }), resized(1600) + root)
check("quality is passed on", loader({ src: CDN + root, width: 400, quality: 60 }), resized(400, 60) + root)

const nested = "products/is2444/IS2444-white.jpg"
check("older /products/ photos too", loader({ src: CDN + nested, width: 828 }), resized(800) + nested)
check("png", loader({ src: CDN + "IS2500-1.png", width: 640 }), resized(800) + "IS2500-1.png")
check("webp", loader({ src: CDN + "IS2500-1.webp", width: 640 }), resized(800) + "IS2500-1.webp")
check("upper-case extension", loader({ src: CDN + "IS1.JPG", width: 640 }), resized(800) + "IS1.JPG")

// Left alone
check("gif untouched", loader({ src: CDN + "promo.gif", width: 640 }), CDN + "promo.gif")
check("svg untouched", loader({ src: CDN + "logo.svg", width: 640 }), CDN + "logo.svg")
check("video untouched", loader({ src: CDN + "stories/a.mp4", width: 640 }), CDN + "stories/a.mp4")
const already = `${CDN}cdn-cgi/image/width=400/IS1.jpg`
check("already transformed untouched", loader({ src: already, width: 640 }), already)
const s3 = "https://medusa-public-images.s3.eu-west-1.amazonaws.com/old.jpg"
check("medusa s3 untouched", loader({ src: s3, width: 640 }), s3)
check("local asset untouched", loader({ src: "/og-default.jpg", width: 640 }), "/og-default.jpg")
check("other hosts use next optimizer", loader({ src: "https://example.com/x.jpg", width: 640 }),
  "/_next/image?url=https%3A%2F%2Fexample.com%2Fx.jpg&w=640&q=75")

// Kill switch (NEXT_PUBLIC_*, so it takes a rebuild): back to the original photo
process.env.NEXT_PUBLIC_CF_IMAGE_RESIZE = "false"
check("switch off = original", loader({ src: CDN + root, width: 640 }), CDN + root)
delete process.env.NEXT_PUBLIC_CF_IMAGE_RESIZE

console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)
