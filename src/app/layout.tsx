import type { Metadata, Viewport } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";

const mono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Déjà Vu",
  description: "Private media collection",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const LYRICS = `Baby, seem like everywhere I go, I see you
From your eyes I smile, it's like I breathe you
Helplessly I reminisce, don't want to
Compare nobody to you
Know that I can't get over you
'Cause everything I see is you
And I don't want no substitute
Baby, I swear it's Déjà Vu
Know that I can't get over you
'Cause everything I see is you
And I don't want no substitute
Baby, I swear it's Déjà Vu
I used to run base like Juan Pierre
Now I run the bass, hi-hat and the snare
I used to bag girls like Birkin Bags
Now I bag B (Boy, you hurtin' that)
Brooklyn Bay where they birthed me at
Now I be everywhere, the nerve of rap
The audacity to have me whippin' curtains back
Me and B, she about to sting, stand back
Baby, seem like everywhere I go, I see you
From your eyes I smile, it's like I breathe you
Helplessly I reminisce, don't want to
Compare nobody to you
Know that I can't get over you
'Cause everything I see is you
And I don't want no substitute
Baby, I swear it's Déjà Vu
Yes, Hova's flow so unusual
Baby, girl you should already know
It's H-O, light up the strobe
'Cause you gon' need help tryna study my bounce
Flow, blow, what's the difference?
One, you take in vein while the other you sniffin'
It's still dope, po-po try to convict him, that's a no-go
My dough keep the scales tippin' like 4-4's
Like I'm from the H-O-U-S-T-O-N
Blow, wind so Chicago of him
Is he the best ever? That's the argu-a-ment
I don't make the list, don't be mad at me
I just make the hits, like a factory
I'm just one-to-one, nothin' after me
No Déjà Vu, just me and my, Oh
I'm seeing things that I know can't be, am I dreaming?
When I saw you walking past me
Almost called your name
Got a better glimpse and then I looked away
Feels like I'm losing it`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Text vielfach wiederholen, damit alle Spalten voll sind.
  const pattern = Array.from({ length: 12 }, () => LYRICS).join("\n");

  return (
    <html lang="de" className={mono.variable}>
      <body>
        <div className="lyrics-bg" aria-hidden="true">
          <div className="lyrics-bg-inner">{pattern}</div>
        </div>
        <div className="site">{children}</div>
      </body>
    </html>
  );
}
